import React from 'react';
import { IconBook, IconCode } from '@tabler/icons';
import Button from 'ui/Button';

const EXAMPLE_CARDS = [
  {
    title: 'Custom matcher',
    body: `chai.Assertion.addMethod('beEven', function () {
  // ...
});`
  },
  {
    title: 'Promise assertion',
    body: `chai.Assertion.addMethod('eventuallyEqual', async function (v) {
  // ...
});`
  },
  {
    title: 'Partial match',
    body: `chai.Assertion.addMethod('partialMatch', function (subset) {
  // ...
});`
  }
];

const EmptyState = ({ onBrowseCatalog, onWriteFromScratch }) => {
  return (
    <div className="plugins-empty">
      <div className="empty-hero">
        <h2 className="empty-title">Extend chai with custom plugins</h2>
        <p className="empty-blurb">
          Add new assertions like <code>.containSubset()</code> or <code>.beEven()</code> that
          your tests can use. Plugin code runs once before every script.
        </p>
        <div className="empty-ctas">
          <Button
            type="button"
            color="primary"
            icon={<IconBook size={16} strokeWidth={1.75} />}
            onClick={onBrowseCatalog}
          >
            Browse catalog
          </Button>
          <Button
            type="button"
            color="secondary"
            variant="outline"
            icon={<IconCode size={16} strokeWidth={1.75} />}
            onClick={onWriteFromScratch}
          >
            Write from scratch
          </Button>
        </div>
      </div>

      <div className="empty-divider">
        <span>or take a look at common shapes</span>
      </div>

      <div className="empty-examples">
        {EXAMPLE_CARDS.map((card) => (
          <div className="example-card" key={card.title}>
            <div className="example-title">{card.title}</div>
            <pre className="example-body">{card.body}</pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmptyState;
