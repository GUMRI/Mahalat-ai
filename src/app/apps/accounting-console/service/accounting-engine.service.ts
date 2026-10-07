import { Injectable, inject } from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { FIRESTORE } from '../../../firebase/firebase.providers';
import { FirebaseAuthService } from '../../../firebase/firebase-auth.service';
import {
  JournalDraft,
  JournalDraftLine,
  PostedJournalLine,
} from '../shared/accounting-engine.models';
import { AccountingConsoleDataService } from './accounting-console-data.service';
import { validateJournalDraft } from '../shared/accounting-engine';

@Injectable({ providedIn: 'root' })
export class AccountingEngineService {
  private readonly firestore = inject(FIRESTORE);
  private readonly auth = inject(FirebaseAuthService);
  private readonly chart = inject(AccountingConsoleDataService);

  async postJournal(shopId: string, draft: JournalDraft): Promise<string> {
    return this.postValidatedJournal(shopId, draft, null);
  }

  async reverseJournal(
    shopId: string,
    branchId: string,
    originalJournalId: string,
    effectiveDate: string,
    reason: string,
  ): Promise<string> {
    const actor = this.auth.user();
    if (!actor) throw new Error('Sign in is required to reverse a journal.');
    if (!reason.trim()) throw new Error('A reason is required to reverse a journal.');

    const originalRef = this.journalRef(shopId, branchId, originalJournalId);
    const snapshot = await getDoc(originalRef);
    if (!snapshot.exists()) throw new Error(`Journal ${originalJournalId} does not exist.`);
    const original = snapshot.data();
    if (original['branch_id'] !== branchId || original['status'] !== 'posted') {
      throw new Error(`Journal ${originalJournalId} cannot be reversed.`);
    }
    const lines = this.readPostedLines(original['lines'], branchId);
    const originalNumber = original['number'];
    if (typeof originalNumber !== 'string') {
      throw new Error(`Journal ${originalJournalId} has an invalid number.`);
    }

    const draft: JournalDraft = {
      idempotency_key: `reverse-${originalJournalId}`,
      branch_id: branchId,
      effective_date: effectiveDate,
      description: `Reversal of ${originalNumber}: ${reason.trim()}`,
      created_by: actor.uid,
      source: {
        kind: 'reversal',
        channel: 'user',
        operational_id: originalJournalId,
        reason: reason.trim(),
      },
      lines: lines.map((line) => ({
        account_code: line.account_code,
        debit: line.credit,
        credit: line.debit,
        ...(line.activity_id ? { activity_id: line.activity_id } : {}),
      })),
    };

    return this.postValidatedJournal(shopId, draft, originalJournalId);
  }

  private async postValidatedJournal(
    shopId: string,
    draft: JournalDraft,
    reversalOf: string | null,
  ): Promise<string> {
    const actor = this.auth.user();
    if (!actor || actor.uid !== draft.created_by) {
      throw new Error('The journal author must be the currently authenticated user.');
    }

    const accounts = await this.chart.getBranchAccounts(shopId, draft.branch_id);
    const preparedDraft = validateJournalDraft(draft, {
      branchId: draft.branch_id,
      accounts,
      periodStatus: 'open',
      actorId: actor.uid,
    });
    const requestPayload = JSON.stringify([
      preparedDraft.canonicalPayload,
      reversalOf,
    ]);
    const accountsByCode = new Map(accounts.map((account) => [account.code, account]));
    const requiredCodes = Array.from(new Set(preparedDraft.lines.map((line) => line.account_code)));
    const accountRefs = requiredCodes.map((code) =>
      doc(
        this.firestore,
        'shops',
        shopId,
        'branches',
        draft.branch_id,
        'accounts',
        code,
      ),
    );
    const memberRef = doc(this.firestore, 'shops', shopId, 'members', actor.uid);
    const sequenceRef = doc(
      this.firestore,
      'shops',
      shopId,
      'accounting_sequences',
      'journal-number',
    );
    const periodRef = doc(
      this.firestore,
      'shops',
      shopId,
      'branches',
      draft.branch_id,
      'accounting_periods',
      draft.effective_date.slice(0, 7),
    );
    const requestRef = doc(
      this.firestore,
      'shops',
      shopId,
      'branches',
      draft.branch_id,
      'posting_requests',
      draft.idempotency_key,
    );
    const sourceRef = draft.source.channel === 'operation' && draft.source.operational_id
      ? doc(
          this.firestore,
          'shops',
          shopId,
          'branches',
          draft.branch_id,
          'accounting_sources',
          `${draft.source.kind}-${draft.source.operational_id}`,
        )
      : null;
    const journalCollection = collection(
      this.firestore,
      'shops',
      shopId,
      'branches',
      draft.branch_id,
      'journal_entries',
    );
    const auditCollection = collection(
      this.firestore,
      'shops',
      shopId,
      'branches',
      draft.branch_id,
      'accounting_audit',
    );
    const originalRef = reversalOf
      ? this.journalRef(shopId, draft.branch_id, reversalOf)
      : null;
    const reversalLinkRef = reversalOf
      ? doc(
          this.firestore,
          'shops',
          shopId,
          'branches',
          draft.branch_id,
          'reversal_links',
          reversalOf,
        )
      : null;

    return runTransaction(this.firestore, async (transaction) => {
      const refs = [
        memberRef,
        sequenceRef,
        periodRef,
        requestRef,
        ...accountRefs,
        ...(sourceRef ? [sourceRef] : []),
        ...(originalRef ? [originalRef] : []),
        ...(reversalLinkRef ? [reversalLinkRef] : []),
      ];
      const snapshots = await Promise.all(refs.map((reference) => transaction.get(reference)));
      const [memberSnapshot, sequenceSnapshot, periodSnapshot, requestSnapshot] = snapshots;
      const member = memberSnapshot.data();
      if (
        !memberSnapshot.exists() ||
        member?.['branch_id'] !== draft.branch_id ||
        (member?.['role'] !== 'owner' && member?.['role'] !== 'accountant')
      ) {
        throw new Error('Only a shop owner or accountant can post a journal.');
      }

      const sequenceIndex = 4 + accountRefs.length;
      let optionalSnapshotIndex = sequenceIndex;
      const sourceSnapshot = sourceRef ? snapshots[optionalSnapshotIndex++] : null;
      const originalSnapshot = originalRef ? snapshots[optionalSnapshotIndex++] : null;
      const reversalLinkSnapshot = reversalLinkRef ? snapshots[optionalSnapshotIndex] : null;

      if (requestSnapshot.exists()) {
        const requestData = requestSnapshot.data();
        if (requestData['payload'] !== requestPayload) {
          throw new Error('This idempotency key was already used for a different journal.');
        }
        const existingId = requestData['journal_id'];
        if (typeof existingId !== 'string') {
          throw new Error('The idempotency record is invalid.');
        }
        return existingId;
      }

      if (sourceSnapshot?.exists()) {
        throw new Error(
          `Source ${draft.source.kind}/${draft.source.operational_id} already has a journal.`,
        );
      }
      if (reversalLinkSnapshot?.exists()) {
        throw new Error(`Journal ${reversalOf} has already been reversed.`);
      }
      if (
        reversalOf &&
        (!originalSnapshot?.exists() ||
          originalSnapshot.data()['branch_id'] !== draft.branch_id ||
          originalSnapshot.data()['status'] !== 'posted' ||
          (typeof originalSnapshot.data()['reversal_of'] === 'string' &&
            originalSnapshot.data()['reversal_of'] !== ''))
      ) {
        throw new Error(`Journal ${reversalOf} is not a posted journal in this branch.`);
      }
      if (reversalOf && originalSnapshot?.exists()) {
        const originalLines = this.readPostedLines(
          originalSnapshot.data()['lines'],
          draft.branch_id,
        );
        const expectedReversalLines = originalLines.map((line) => ({
          account_code: line.account_code,
          debit: line.credit,
          credit: line.debit,
          ...(line.activity_id ? { activity_id: line.activity_id } : {}),
        }));
        if (JSON.stringify(expectedReversalLines) !== JSON.stringify(draft.lines)) {
          throw new Error('The reversal lines do not exactly offset the original journal.');
        }
      }

      if (
        periodSnapshot.exists() &&
        periodSnapshot.data()['status'] !== 'open' &&
        periodSnapshot.data()['status'] !== 'closed'
      ) {
        throw new Error(
          `Accounting period ${draft.effective_date.slice(0, 7)} has an invalid status.`,
        );
      }

      const currentSequence = sequenceSnapshot.exists()
        ? sequenceSnapshot.data()['last_sequence']
        : 0;
      if (
        typeof currentSequence !== 'number' ||
        !Number.isSafeInteger(currentSequence) ||
        currentSequence < 0
      ) {
        throw new Error('The journal number sequence is invalid.');
      }

      const accountData = snapshots.slice(4, 4 + accountRefs.length);
      for (let index = 0; index < accountData.length; index += 1) {
        const snapshot = accountData[index];
        const account = accountsByCode.get(requiredCodes[index]);
        if (
          !snapshot.exists() ||
          !account ||
          snapshot.data()['branch_id'] !== draft.branch_id ||
          snapshot.data()['code'] !== account.code ||
          snapshot.data()['group_code'] !== account.group_code ||
          snapshot.data()['is_leaf'] !== true ||
          (snapshot.data()['is_active'] !== undefined &&
            snapshot.data()['is_active'] !== true)
        ) {
          throw new Error(`Account ${requiredCodes[index]} is no longer a postable leaf account.`);
        }
      }

      const periodData = periodSnapshot.data();
      const periodStatus = periodData?.['status'] === 'closed' ? 'closed' : 'open';
      const validated = validateJournalDraft(draft, {
        branchId: draft.branch_id,
        accounts,
        periodStatus,
        actorId: actor.uid,
      });
      const sequence = currentSequence + 1;
      const journalId = `JRN-${String(sequence).padStart(8, '0')}`;
      const journalRef = doc(journalCollection, journalId);
      if ((await transaction.get(journalRef)).exists()) {
        throw new Error(`Journal sequence conflict: ${journalId} already exists.`);
      }
      const auditRef = doc(auditCollection, journalId);
      const postedAt = serverTimestamp();
      const lines: readonly PostedJournalLine[] = validated.lines.map((line) => ({
        ...line,
        branch_id: draft.branch_id,
        activity_id: line.activity_id ?? null,
      }));
      const source = {
        ...draft.source,
        ...(draft.source.reason ? { reason: draft.source.reason.trim() } : {}),
        ...(draft.source.user_prompt ? { user_prompt: draft.source.user_prompt.trim() } : {}),
      };
      const journal = {
        id: journalId,
        sequence,
        number: journalId,
        branch_id: draft.branch_id,
        effective_date: draft.effective_date,
        description: draft.description.trim(),
        created_by: actor.uid,
        source,
        status: 'posted',
        reversal_of: reversalOf,
        total_debit: validated.total,
        total_credit: validated.total,
        lines,
        posted_at: postedAt,
      };

      transaction.set(journalRef, journal);
      if (sequenceSnapshot.exists()) {
        transaction.update(sequenceRef, {
          last_sequence: sequence,
          last_journal_id: journalId,
        });
      } else {
        transaction.set(sequenceRef, {
          last_sequence: sequence,
          last_journal_id: journalId,
        });
      }
      transaction.set(requestRef, {
        payload: requestPayload,
        journal_id: journalId,
        created_at: postedAt,
      });
      if (sourceRef) {
        transaction.set(sourceRef, {
          source_kind: draft.source.kind,
          operational_id: draft.source.operational_id,
          journal_id: journalId,
          branch_id: draft.branch_id,
          created_at: postedAt,
        });
      }
      if (reversalLinkRef) {
        transaction.set(reversalLinkRef, {
          original_journal_id: reversalOf,
          reversal_journal_id: journalId,
          branch_id: draft.branch_id,
          created_at: postedAt,
        });
      }
      transaction.set(auditRef, {
        action: reversalOf ? 'journal_reversed' : 'journal_posted',
        journal_id: journalId,
        reversal_of: reversalOf,
        branch_id: draft.branch_id,
        actor_id: actor.uid,
        source,
        reason: source.reason ?? null,
        created_at: postedAt,
      });

      return journalId;
    });
  }

  private journalRef(shopId: string, branchId: string, journalId: string) {
    return doc(
      this.firestore,
      'shops',
      shopId,
      'branches',
      branchId,
      'journal_entries',
      journalId,
    );
  }

  private readPostedLines(value: unknown, branchId: string): JournalDraftLine[] {
    if (!Array.isArray(value) || value.length < 2) {
      throw new Error('The original journal has invalid lines.');
    }
    return value.map((lineValue) => {
      if (typeof lineValue !== 'object' || lineValue === null) {
        throw new Error('The original journal contains an invalid line.');
      }
      const line = lineValue as Record<string, unknown>;
      if (
        line['branch_id'] !== branchId ||
        typeof line['account_code'] !== 'string' ||
        typeof line['debit'] !== 'number' ||
        typeof line['credit'] !== 'number' ||
        !Number.isSafeInteger(line['debit']) ||
        !Number.isSafeInteger(line['credit'])
      ) {
        throw new Error('The original journal contains an invalid line.');
      }
      return {
        account_code: line['account_code'],
        debit: line['debit'],
        credit: line['credit'],
        ...(typeof line['activity_id'] === 'string'
          ? { activity_id: line['activity_id'] }
          : {}),
      };
    });
  }

}
