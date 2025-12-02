import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import {
  IconCpu,
  IconDatabase,
  IconClock,
  IconServer,
  IconChevronDown
} from '@tabler/icons';

const getProcessOptions = (processes) => {
  return [
    { value: 'cumulative', label: 'Cumulative (All Processes)' },
    ...(processes ?? []).map((process) => ({
      value: String(process.pid),
      label: `PID ${process.pid}${process.title ? ` - ${process.title}` : ''}${process.type ? ` (${process.type})` : ''}`
    }))
  ];
};

const Performance = () => {
  const { systemResources } = useSelector((state) => state.performance);
  const [selectedPid, setSelectedPid] = useState('cumulative');

  useEffect(() => {
    const { ipcRenderer } = window;

    if (!ipcRenderer) {
      console.warn('IPC Renderer not available');
      return;
    }

    const startMonitoring = async () => {
      try {
        await ipcRenderer.invoke('renderer:start-system-monitoring', 2000);
      } catch (error) {
        console.error('Failed to start system monitoring:', error);
      }
    };

    const stopMonitoring = async () => {
      try {
        await ipcRenderer.invoke('renderer:stop-system-monitoring');
      } catch (error) {
        console.error('Failed to stop system monitoring:', error);
      }
    };

    startMonitoring();

    return () => {
      stopMonitoring();
    };
  }, []);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const SystemResourceCard = ({ icon: Icon, title, value, subtitle, color = 'default', trend }) => (
    <div className={`resource-card ${color}`}>
      <div className="resource-header">
        <Icon size={20} strokeWidth={1.5} />
        <span className="resource-title">{title}</span>
      </div>
      <div className="resource-value">{value}</div>
      {subtitle && <div className="resource-subtitle">{subtitle}</div>}
      {trend && (
        <div className={`resource-trend ${trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable'}`}>
          <IconChartLine size={12} strokeWidth={1.5} />
          <span>
            {trend > 0 ? '+' : ''}
            {trend.toFixed(1)}
            %
          </span>
        </div>
      )}
    </div>
  );

  // Get process options for dropdown
  const processOptions = useMemo(() => getProcessOptions(systemResources.processes), [systemResources.processes]);

  // Get selected process data
  const selectedProcess = useMemo(() => {
    if (selectedPid === 'cumulative') {
      return null; // Show cumulative view
    }
    const processes = systemResources.processes || [];
    return processes.find((p) => String(p.pid) === selectedPid) || null;
  }, [selectedPid, systemResources.processes]);

  // Reset to cumulative if selected PID no longer exists
  useEffect(() => {
    if (selectedPid !== 'cumulative' && !selectedProcess) {
      setSelectedPid('cumulative');
    }
  }, [selectedPid, selectedProcess]);

  const renderCumulativeView = () => (
    <div className="system-resources">
      <h2>System Resources</h2>
      <div className="resource-cards">
        <SystemResourceCard
          icon={IconCpu}
          title="CPU Usage"
          value={`${systemResources.cpu.toFixed(1)}%`}
          subtitle="Total CPU usage"
          color={systemResources.cpu > 80 ? 'danger' : systemResources.cpu > 60 ? 'warning' : 'success'}
        />

        <SystemResourceCard
          icon={IconDatabase}
          title="Memory Usage"
          value={formatBytes(systemResources.memory)}
          subtitle="Total memory usage"
          color={systemResources.memory > (500 * 1024 * 1024) ? 'danger' : 'default'}
        />

        <SystemResourceCard
          icon={IconClock}
          title="Uptime"
          value={formatUptime(systemResources.uptime)}
          subtitle="Process runtime"
          color="info"
        />

        <SystemResourceCard
          icon={IconServer}
          title="Process ID"
          value={systemResources.pid || 'N/A'}
          subtitle="Main process PID"
          color="default"
        />
      </div>
    </div>
  );

  const renderProcessView = (process) => {
    if (!process) return null;

    // Calculate uptime for individual process
    const processUptime = process.creationTime
      ? (new Date() - new Date(process.creationTime)) / 1000
      : 0;

    return (
      <div className="system-resources">
        <h2>System Resources</h2>
        <div className="resource-cards">
          <SystemResourceCard
            icon={IconCpu}
            title="CPU Usage"
            value={`${process.cpu.toFixed(1)}%`}
            subtitle="Current CPU usage"
            color={process.cpu > 80 ? 'danger' : process.cpu > 60 ? 'warning' : 'success'}
          />

          <SystemResourceCard
            icon={IconDatabase}
            title="Memory Usage"
            value={formatBytes(process.memory)}
            subtitle="Current memory usage"
            color={process.memory > (500 * 1024 * 1024) ? 'danger' : 'default'}
          />

          <SystemResourceCard
            icon={IconClock}
            title="Uptime"
            value={formatUptime(processUptime)}
            subtitle="Process runtime"
            color="info"
          />

          <SystemResourceCard
            icon={IconServer}
            title="Process ID"
            value={process.pid}
            subtitle="Process PID"
            color="default"
          />
        </div>
      </div>
    );
  };

  return (
    <StyledWrapper>
      <div className="tab-content">
        <div className="performance-header">
          <div className="performance-selector-wrapper">
            <label htmlFor="process-selector" className="performance-selector-label">
              View:
            </label>
            <div className="performance-selector">
              <select
                id="process-selector"
                value={selectedPid}
                onChange={(e) => setSelectedPid(e.target.value)}
                className="performance-select"
              >
                {processOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <IconChevronDown size={16} className="performance-select-icon" />
            </div>
          </div>
        </div>
        <div className="tab-content-area">
          {selectedPid === 'cumulative' ? renderCumulativeView() : renderProcessView(selectedProcess)}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Performance;
