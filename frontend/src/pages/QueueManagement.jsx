import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ListOrdered, UserCheck, Activity, RefreshCw } from 'lucide-react';
import {
  getServices,
  getQueue,
  serveNext,
  removeUser,
  reorderQueue,
} from '../mock/api';
import { useNotification } from '../context/NotificationContext';
import { Card, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import styles from './QueueManagement.module.css';

const POLL_MS = 4000;
const DND_MIME = 'application/x-queuesmart-queue-index';

function priorityClass(priority, classes) {
  const p = String(priority || '').toLowerCase();
  if (p === 'high') return classes.priorityHigh;
  if (p === 'low') return classes.priorityLow;
  return classes.priorityMedium;
}

export function QueueManagement() {
  const [services, setServices] = useState([]);
  const [overview, setOverview] = useState({});
  const [selectedId, setSelectedId] = useState('');
  const [removeTarget, setRemoveTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);
  const pausePollRef = useRef(false);
  const dropInProgressRef = useRef(false);
  const { addNotification } = useNotification();

  const refreshEverything = useCallback(async () => {
    const list = await getServices();
    setServices(list);
    const nextOverview = {};
    await Promise.all(
      list.map(async (s) => {
        const entries = await getQueue(s.id);
        nextOverview[s.id] = entries;
      }),
    );
    setOverview(nextOverview);
    setLastSync(new Date());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await refreshEverything();
    };
    run();
    const interval = setInterval(() => {
      if (!cancelled && !pausePollRef.current) refreshEverything();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshEverything]);

  const queue = useMemo(
    () => (selectedId ? overview[selectedId] ?? [] : []),
    [overview, selectedId],
  );

  const displayServices = useMemo(
    () => (selectedId ? services.filter((s) => s.id === selectedId) : services),
    [services, selectedId],
  );

  const totalWaiting = useMemo(
    () => displayServices.reduce((n, s) => n + (overview[s.id]?.length ?? 0), 0),
    [displayServices, overview],
  );

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshEverything();
    setRefreshing(false);
  };

  const handleServeNext = async () => {
    if (!selectedId) return;
    setLoading(true);
    const served = await serveNext(selectedId);
    setLoading(false);
    if (served) {
      addNotification({ message: `Served ${served.userName}`, type: 'success' });
      await refreshEverything();
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setLoading(true);
    const ok = await removeUser(removeTarget.id);
    setLoading(false);
    setRemoveTarget(null);
    if (ok) {
      addNotification({ message: 'User removed from queue', type: 'info' });
      await refreshEverything();
    }
  };

  const applyOrder = async (nextEntries) => {
    if (!selectedId || nextEntries.length === 0) return;
    setLoading(true);
    const ok = await reorderQueue(selectedId, nextEntries.map((e) => e.id));
    setLoading(false);
    if (ok) await refreshEverything();
  };

  const handleReorder = async (fromIndex, toIndex) => {
    if (!selectedId || toIndex < 0 || toIndex >= queue.length) return;
    const next = [...queue];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    await applyOrder(next);
  };

  const handleDragStart = (e, index) => {
    pausePollRef.current = true;
    setDragIndex(index);
    const id = String(index);
    e.dataTransfer.setData(DND_MIME, id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setDragImage(e.currentTarget, 24, 20);
    } catch {
      /* ignore */
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDropTargetIndex(null);
    if (!dropInProgressRef.current) pausePollRef.current = false;
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetIndex(index);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData(DND_MIME) || e.dataTransfer.getData('text/plain');
    const fromIndex = parseInt(raw, 10);
    if (!selectedId || Number.isNaN(fromIndex) || fromIndex === dropIndex) {
      pausePollRef.current = false;
      setDragIndex(null);
      setDropTargetIndex(null);
      return;
    }

    dropInProgressRef.current = true;
    const next = [...queue];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(dropIndex, 0, removed);

    void (async () => {
      try {
        await applyOrder(next);
      } finally {
        dropInProgressRef.current = false;
        pausePollRef.current = false;
        setDragIndex(null);
        setDropTargetIndex(null);
      }
    })();
  };

  const selected = services.find((s) => s.id === selectedId);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>
        <ListOrdered size={28} className={styles.pageIcon} aria-hidden />
        Queue management
      </h1>

      <Card className={styles.toolbarCard}>
        <div className={styles.toolbarInner}>
          <CardTitle>
            <Activity size={20} aria-hidden />
            Live floor & filter
          </CardTitle>
          <p className={styles.refreshHint}>
            Queues refresh automatically every few seconds. Pick a service to serve next, reorder, or remove
            someone.
          </p>
          <div className={styles.toolbarRow}>
            <div className={styles.selectWrap}>
              <span className={styles.selectLabel} id="qm-service-label">
                Service
              </span>
              <select
                id="qm-service"
                aria-labelledby="qm-service-label"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className={styles.select}
              >
                <option value="">All services — live overview</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.liveBlock}>
              <span className={styles.livePill}>
                <span className={styles.liveDot} aria-hidden />
                Live
              </span>
              {lastSync && (
                <span className={styles.lastSync}>
                  Updated {lastSync.toLocaleTimeString()}
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleManualRefresh}
                disabled={refreshing}
              >
                <RefreshCw size={16} aria-hidden className={refreshing ? styles.spinning : undefined} />
                Refresh now
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className={styles.overviewCard}>
        <div className={styles.overviewHeader}>
          <h2 className={styles.overviewTitle}>
            {selectedId ? `Queue — ${selected?.name ?? 'Service'}` : 'All active queues'}
          </h2>
          <span className={styles.totalBadge}>{totalWaiting} waiting</span>
        </div>
        {displayServices.length === 0 ? (
          <p className={styles.empty}>No services yet.</p>
        ) : (
          <div className={styles.liveGrid}>
            {displayServices.map((svc) => {
              const entries = overview[svc.id] ?? [];
              return (
                <div key={svc.id} className={styles.liveColumn}>
                  <div className={styles.columnHead}>
                    <h3 className={styles.columnTitle}>{svc.name}</h3>
                    <div className={styles.columnMeta}>
                      <span className={styles.countChip}>{entries.length} waiting</span>
                      <span
                        className={`${styles.openPill} ${svc.isOpen ? styles.openPillOpen : styles.openPillClosed}`}
                      >
                        {svc.isOpen ? 'Open' : 'Closed'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.columnBody}>
                    {entries.length === 0 ? (
                      <p className={styles.columnEmpty}>No one in line</p>
                    ) : (
                      entries.map((entry, idx) => {
                        const waitAhead = idx * (svc.expectedDurationMinutes ?? 0);
                        const almost = entry.status === 'almost_ready';
                        return (
                          <div
                            key={entry.id}
                            className={`${styles.entryChip} ${almost ? styles.entryChipAlmost : ''}`}
                          >
                            <div className={styles.posCircle} title="Position">
                              {idx + 1}
                            </div>
                            <div className={styles.entryName}>{entry.userName}</div>
                            <div className={styles.entryRow}>
                              <span
                                className={`${styles.priorityBadge} ${priorityClass(entry.priority, styles)}`}
                              >
                                {entry.priority}
                              </span>
                              <span
                                className={`${styles.statusDot} ${almost ? styles.statusDotReady : ''}`}
                                title={almost ? 'Next to be served' : 'Waiting'}
                                aria-hidden
                              />
                              <span className={styles.entryTime}>
                                Joined {new Date(entry.joinedAt).toLocaleTimeString()}
                              </span>
                              {waitAhead > 0 && (
                                <span className={styles.waitEst}>~{waitAhead} min ahead</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {selectedId ? (
        <Card>
          <CardTitle>
            <ListOrdered size={20} aria-hidden />
            Actions for {selected.name}
          </CardTitle>
          <div className={styles.actions}>
            <Button
              variant="primary"
              onClick={handleServeNext}
              disabled={queue.length === 0 || loading}
            >
              <UserCheck size={18} aria-hidden />
              Serve next
            </Button>
          </div>
          {queue.length === 0 ? (
            <p className={styles.empty}>No one in queue.</p>
          ) : (
            <ul className={styles.queueList} aria-label="Queue order — drag rows to reorder">
              {queue.map((entry, i) => (
                <li
                  key={entry.id}
                  className={`${styles.queueItem} ${dragIndex === i ? styles.queueItemDragging : ''} ${
                    dropTargetIndex === i && dragIndex !== i ? styles.queueItemDropTarget : ''
                  }`}
                  draggable={!loading}
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={(e) => handleDrop(e, i)}
                >
                  <span className={styles.dragHandle} title="Drag to reorder" aria-hidden>
                    ⋮⋮
                  </span>
                  <div className={styles.entryInfo}>
                    <strong>{entry.userName}</strong>
                    <span className={styles.meta}>
                      {entry.priority} · joined {new Date(entry.joinedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={styles.entryActions}>
                    <Button variant="outline" draggable={false} onClick={() => setRemoveTarget(entry)}>
                      Remove
                    </Button>
                    {i > 0 && (
                      <Button
                        variant="outline"
                        draggable={false}
                        onClick={() => handleReorder(i, i - 1)}
                        disabled={loading}
                      >
                        ↑
                      </Button>
                    )}
                    {i < queue.length - 1 && (
                      <Button
                        variant="outline"
                        draggable={false}
                        onClick={() => handleReorder(i, i + 1)}
                        disabled={loading}
                      >
                        ↓
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card>
          <p className={styles.hintSelect}>
            Select a specific service above to use <strong>Serve next</strong>, <strong>Remove</strong>, or{' '}
            <strong>reorder</strong> controls.
          </p>
        </Card>
      )}

      <Modal
        open={!!removeTarget}
        title="Remove user"
        onClose={() => setRemoveTarget(null)}
        actions={
          <>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRemove} disabled={loading}>
              Remove
            </Button>
          </>
        }
      >
        {removeTarget && (
          <p>
            Remove <strong>{removeTarget.userName}</strong> from the queue?
          </p>
        )}
      </Modal>
    </div>
  );
}
