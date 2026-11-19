import React, { useState } from 'react';
import Modal from 'components/Modal';
import Portal from 'components/Portal';

const UNIT_MS = {
  seconds: 1000,
  minutes: 60 * 1000
};

const ScheduleSendModal = ({ onConfirm, onClose }) => {
  const [value, setValue] = useState('5');
  const [unit, setUnit] = useState('seconds');
  const amount = Number(value);
  const isValid = Number.isFinite(amount) && amount > 0;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(Math.max(1000, Math.round(amount * UNIT_MS[unit])));
  };

  return (
    <Portal>
      <Modal
        size="sm"
        title="Repeat on Interval"
        confirmText="Start"
        handleConfirm={handleConfirm}
        handleCancel={onClose}
        confirmDisabled={!isValid}
        dataTestId="schedule-send-modal"
      >
        <form
          className="bruno-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirm();
          }}
        >
          <label htmlFor="schedule-send-value" className="block font-medium">
            Send every
          </label>
          <div className="flex gap-2 mt-2">
            <input
              id="schedule-send-value"
              type="number"
              min="1"
              autoFocus
              className="block textbox w-full"
              data-testid="schedule-send-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <select
              className="block textbox"
              data-testid="schedule-send-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="seconds">seconds</option>
              <option value="minutes">minutes</option>
            </select>
          </div>
        </form>
      </Modal>
    </Portal>
  );
};

export default ScheduleSendModal;
