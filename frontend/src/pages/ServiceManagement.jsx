import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2 } from 'lucide-react';
import { getServices, createService, updateService, deleteService } from '../mock/api';
import { validateService } from '../utils/validation';
import { Card, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import styles from './ServiceManagement.module.css';

const PRIORITIES = ['low', 'medium', 'high'];

export function ServiceManagement() {
  const [services, setServices] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    expectedDurationMinutes: '',
    priorityLevel: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => getServices().then(setServices);

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing('new');
    setForm({ name: '', description: '', expectedDurationMinutes: '', priorityLevel: 'medium' });
    setErrors({});
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description,
      expectedDurationMinutes: String(s.expectedDurationMinutes),
      priorityLevel: s.priorityLevel,
    });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateService(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    if (editing && editing !== 'new' && editing.id) {
      await updateService(editing.id, {
        name: form.name,
        description: form.description,
        expectedDurationMinutes: Number(form.expectedDurationMinutes),
        priorityLevel: form.priorityLevel,
      });
    } else {
      await createService(form);
    }
    setSaving(false);
    setEditing(undefined);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const ok = await deleteService(deleteTarget.id);
    setSaving(false);
    setDeleteTarget(null);
    if (ok) load();
  };

  const isOpen = editing !== undefined && editing !== null;
  const isCreate = editing === 'new';

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>
        <Settings size={28} className={styles.pageIcon} aria-hidden />
        Service management
      </h1>
      <div className={styles.toolbar}>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={18} aria-hidden />
          Create service
        </Button>
      </div>
      <Card>
        <CardTitle>
          <Settings size={20} aria-hidden />
          Services
        </CardTitle>
        <ul className={styles.list}>
          {services.map((s) => (
            <li key={s.id} className={styles.row}>
              <div>
                <strong>{s.name}</strong>
                <p className={styles.desc}>{s.description}</p>
                <span className={styles.meta}>
                  {s.expectedDurationMinutes} min · {s.priorityLevel} priority
                </span>
              </div>
              <div className={styles.rowActions}>
                <Button variant="outline" onClick={() => openEdit(s)}>
                  Edit
                </Button>
                <Button variant="outline" onClick={() => setDeleteTarget(s)} className={styles.deleteBtn}>
                  <Trash2 size={14} aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Modal
        open={!!deleteTarget}
        title="Delete service"
        onClose={() => setDeleteTarget(null)}
        actions={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={saving}>
              Delete
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <p>
            Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
            This cannot be undone. Services with users still waiting cannot be deleted.
          </p>
        )}
      </Modal>

      <Modal
        open={isOpen}
        title={isCreate ? 'New service' : 'Edit service'}
        onClose={() => setEditing(undefined)}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditing(undefined)}>
              Cancel
            </Button>
            <Button type="submit" form="service-form" variant="primary" disabled={saving}>
              {isCreate ? 'Create' : 'Save'}
            </Button>
          </>
        }
      >
        {isOpen && (
          <form id="service-form" onSubmit={handleSubmit} className={styles.form}>
            <Input
              label="Service name (max 100 characters)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              error={errors.name}
              maxLength={100}
              required
            />
            <div className={styles.wrap}>
              <label htmlFor="service-desc">Description (required)</label>
              <textarea
                id="service-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className={styles.textarea}
              />
              {errors.description && <span className={styles.error}>{errors.description}</span>}
            </div>
            <Input
              label="Expected duration (minutes, min 1)"
              type="number"
              min={1}
              value={form.expectedDurationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, expectedDurationMinutes: e.target.value }))}
              error={errors.expectedDurationMinutes}
            />
            <div className={styles.wrap}>
              <label>Priority level (required)</label>
              <div className={styles.radioGroup}>
                {PRIORITIES.map((p) => (
                  <label key={p} className={styles.radio}>
                    <input
                      type="radio"
                      name="priorityLevel"
                      value={p}
                      checked={form.priorityLevel === p}
                      onChange={(e) => setForm((f) => ({ ...f, priorityLevel: e.target.value }))}
                    />
                    {p}
                  </label>
                ))}
              </div>
              {errors.priorityLevel && <span className={styles.error}>{errors.priorityLevel}</span>}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
