import React, { useCallback, useState } from 'react';
import type { DailyEntry, DailyEntryPayload, Goal } from '../../types';
import DailyEntryForm from '../DailyEntryForm';
import DailyEntryList from '../DailyEntryList';
import Modal from '../ui/Modal';
import { PlusIcon } from '../ui/icons';

interface EntriesViewProps {
  entries: DailyEntry[];
  goals: Goal[];
  onCreateEntry: (payload: DailyEntryPayload) => Promise<unknown>;
  onUpdateEntry: (id: number, payload: DailyEntryPayload) => Promise<unknown>;
  onDeleteEntry: (id: number) => void;
  isCreating: boolean;
  isUpdating: boolean;
  deletingEntryId: number | null;
}

const EntriesView: React.FC<EntriesViewProps> = ({
  entries,
  goals,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  isCreating,
  isUpdating,
  deletingEntryId,
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DailyEntry | null>(null);

  const handleCreate = useCallback(
    async (payload: DailyEntryPayload) => {
      const created = await onCreateEntry(payload);
      if (created) setIsCreateOpen(false);
    },
    [onCreateEntry]
  );

  const handleUpdate = useCallback(
    async (payload: DailyEntryPayload) => {
      if (!editingEntry) return;
      const updated = await onUpdateEntry(editingEntry.id, payload);
      if (updated) setEditingEntry(null);
    },
    [editingEntry, onUpdateEntry]
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Daily Entries</h2>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="btn btn-primary flex items-center justify-center"
          aria-label="Add entry"
        >
          <PlusIcon className="mr-1 h-5 w-5" />
          Add
        </button>
      </div>

      <DailyEntryList
        entries={entries}
        goals={goals}
        onEdit={setEditingEntry}
        onDelete={onDeleteEntry}
        deletingEntryId={deletingEntryId}
      />

      <Modal open={isCreateOpen} title="Add Entry" onClose={() => setIsCreateOpen(false)}>
        <DailyEntryForm
          mode="create"
          goals={goals}
          onSubmit={handleCreate}
          isSubmitting={isCreating}
        />
      </Modal>

      <Modal
        open={editingEntry !== null}
        title="Edit Daily Entry"
        onClose={() => setEditingEntry(null)}
      >
        {editingEntry ? (
          <DailyEntryForm
            key={editingEntry.id}
            mode="edit"
            goals={goals}
            entry={editingEntry}
            onSubmit={handleUpdate}
            onCancel={() => setEditingEntry(null)}
            isSubmitting={isUpdating}
          />
        ) : null}
      </Modal>
    </div>
  );
};

export default EntriesView;
