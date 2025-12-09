import React, { useState, useEffect } from 'react';
import { Clock, Play, Square, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { reminderScheduler } from '../lib/reminderScheduler';

const ReminderSchedulerStatus: React.FC = () => {
  const [status, setStatus] = useState(reminderScheduler.getStatus());
  const [config, setConfig] = useState(reminderScheduler.getConfig());
  const [countdown, setCountdown] = useState<string>('');

  // Update status every second
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(reminderScheduler.getStatus());
      setConfig(reminderScheduler.getConfig());
      updateCountdown();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const updateCountdown = () => {
    if (!status.nextRunTime) {
      setCountdown('Not scheduled');
      return;
    }

    const now = new Date();
    const diff = status.nextRunTime.getTime() - now.getTime();

    if (diff <= 0) {
      setCountdown('Running now...');
      return;
    }

    const minutes = Math.floor(diff / 1000 / 60);
    const seconds = Math.floor((diff / 1000) % 60);
    setCountdown(`${minutes}m ${seconds}s`);
  };

  const handleStart = () => {
    reminderScheduler.start(5);
    setStatus(reminderScheduler.getStatus());
    setConfig(reminderScheduler.getConfig());
  };

  const handleStop = () => {
    reminderScheduler.stop();
    setStatus(reminderScheduler.getStatus());
    setConfig(reminderScheduler.getConfig());
  };

  const isActive = reminderScheduler.isActive();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Clock className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Automated Reminder Scheduler</h2>
        </div>
        <div className="flex items-center space-x-2">
          {isActive ? (
            <span className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              <span>Active</span>
            </span>
          ) : (
            <span className="flex items-center space-x-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
              <span>Inactive</span>
            </span>
          )}
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Check Interval */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Check Interval</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{config.intervalMinutes} min</p>
        </div>

        {/* Next Check */}
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Next Check In</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">{countdown}</p>
        </div>

        {/* Total Runs */}
        <div className="bg-indigo-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-900">Total Runs</span>
          </div>
          <p className="text-2xl font-bold text-indigo-600">{status.totalRuns}</p>
        </div>

        {/* Last Run */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Last Run</span>
          </div>
          <p className="text-sm font-bold text-gray-600">
            {status.lastRunTime ? status.lastRunTime.toLocaleTimeString() : 'Never'}
          </p>
        </div>
      </div>

      {/* Last Run Results */}
      {status.lastRunResult && (
        <div className={`rounded-lg p-4 mb-6 ${
          status.lastRunResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start space-x-3">
            {status.lastRunResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className={`font-semibold mb-2 ${
                status.lastRunResult.success ? 'text-green-900' : 'text-red-900'
              }`}>
                Last Check Results
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Checked:</span>
                  <span className="ml-2 font-semibold">{status.lastRunResult.totalChecked}</span>
                </div>
                <div>
                  <span className="text-gray-600">Sent:</span>
                  <span className="ml-2 font-semibold text-green-600">{status.lastRunResult.remindersSent}</span>
                </div>
                <div>
                  <span className="text-gray-600">Errors:</span>
                  <span className="ml-2 font-semibold text-red-600">{status.lastRunResult.errors}</span>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <span className="text-gray-600">Status:</span>
                  <span className={`ml-2 font-semibold ${
                    status.lastRunResult.success ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {status.lastRunResult.success ? 'Success' : 'Failed'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center space-x-4">
        {isActive ? (
          <button
            onClick={handleStop}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Square className="w-4 h-4" />
            <span>Stop Scheduler</span>
          </button>
        ) : (
          <button
            onClick={handleStart}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Play className="w-4 h-4" />
            <span>Start Scheduler</span>
          </button>
        )}

        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <AlertCircle className="w-4 h-4" />
          <span>Scheduler runs automatically every 5 minutes when active</span>
        </div>
      </div>
    </div>
  );
};

export default ReminderSchedulerStatus;

