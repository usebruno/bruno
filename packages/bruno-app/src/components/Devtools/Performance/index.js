import React from 'react';
import { useSelector } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import {
  IconCpu,
  IconDatabase,
  IconClock,
  IconServer,
  IconChartLine,
} from '@tabler/icons';

const Performance = () => {
  const { systemResources } = useSelector(state => state.performance);

  const formatBytes = bytes => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = seconds => {
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

  return (
    <StyledWrapper>
      <div className="tab-content">
        <div className="tab-content-area">
          <div className="system-resources">
            <h2>System Resources</h2>
            <div className="resource-cards">
              <SystemResourceCard
                icon={IconCpu}
                title="CPU Usage"
                value={`${systemResources.cpu.toFixed(1)}%`}
                subtitle="Current process"
                color={systemResources.cpu > 80 ? 'danger' : systemResources.cpu > 60 ? 'warning' : 'success'}
              />

              <SystemResourceCard
                icon={IconDatabase}
                title="Memory Usage"
                value={formatBytes(systemResources.memory)}
                subtitle="Current process"
                color={systemResources.memory > 500 * 1024 * 1024 ? 'danger' : 'default'}
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
                subtitle="Current PID"
                color="default"
              />
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Performance;
