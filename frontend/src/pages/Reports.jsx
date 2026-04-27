import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { getAdminReportOverview, downloadAdminReportCsv, getServices } from '../mock/api';
import { Card, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import styles from './Reports.module.css';

export function Reports() {
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const filters = useMemo(() => ({ serviceId, from, to }), [serviceId, from, to]);

  useEffect(() => {
    getServices().then((list) => setServices(list));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const next = await getAdminReportOverview(filters);
      if (!cancelled) {
        setReport(next);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const handleExport = async () => {
    setExporting(true);
    await downloadAdminReportCsv(filters);
    setExporting(false);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>
        <BarChart3 size={28} className={styles.pageIcon} aria-hidden />
        Reporting
      </h1>
      <p className={styles.subtitle}>Generate queue usage and participation reports with optional filters.</p>

      <Card>
        <CardTitle>Filters</CardTitle>
        <div className={styles.filters}>
          <label className={styles.field}>
            <span>Service</span>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={styles.input}>
              <option value="">All services</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={styles.input} />
          </label>
          <label className={styles.field}>
            <span>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={styles.input} />
          </label>
          <Button variant="secondary" onClick={handleExport} disabled={exporting || loading}>
            <Download size={16} aria-hidden />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Summary</CardTitle>
        {loading || !report ? (
          <p className={styles.empty}>Loading report...</p>
        ) : (
          <div className={styles.summaryGrid}>
            <div className={styles.metric}>
              <strong>{report.summary.totalUsers}</strong>
              <span>Users</span>
            </div>
            <div className={styles.metric}>
              <strong>{report.summary.totalHistoryRecords}</strong>
              <span>History rows</span>
            </div>
            <div className={styles.metric}>
              <strong>{report.summary.totalServed}</strong>
              <span>Served</span>
            </div>
            <div className={styles.metric}>
              <strong>{report.summary.averageWaitMinutes}</strong>
              <span>Avg wait (min)</span>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Service activity</CardTitle>
        {loading || !report ? (
          <p className={styles.empty}>Loading report...</p>
        ) : report.services.length === 0 ? (
          <p className={styles.empty}>No service activity for the selected filters.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Served</th>
                  <th>Participation</th>
                  <th>Current queue</th>
                  <th>Avg wait</th>
                </tr>
              </thead>
              <tbody>
                {report.services.map((service) => (
                  <tr key={service.serviceId}>
                    <td>{service.serviceName}</td>
                    <td>{service.usersServed}</td>
                    <td>{service.totalParticipation}</td>
                    <td>{service.currentQueueLength}</td>
                    <td>{service.averageWaitMinutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>User participation</CardTitle>
        {loading || !report ? (
          <p className={styles.empty}>Loading report...</p>
        ) : report.users.length === 0 ? (
          <p className={styles.empty}>No user history for the selected filters.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Participation count</th>
                  <th>Most recent outcome</th>
                </tr>
              </thead>
              <tbody>
                {report.users.map((user) => (
                  <tr key={user.userId}>
                    <td>{user.userName}</td>
                    <td>{user.participationCount}</td>
                    <td>{user.history[0]?.outcome ?? 'n/a'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
