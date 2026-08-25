import React, { useId, useState } from 'react';
import { IconChevronRight, IconListCheck, IconGitBranch, IconInfoCircle } from '@tabler/icons';
import { Tooltip } from 'react-tooltip';
import ToggleSwitch from 'components/ToggleSwitch';
import IncludeExcludeTags from './IncludeExcludeTags';
import StyledWrapper from './StyledWrapper';

const TAGS_HINT = 'Tags are labels on requests (e.g. smoke, WIP). Manage tags in Request › Settings';

const Advanced = ({
  filterByTags,
  onFilterModeChange,
  tags,
  availableTags,
  onTagsChange,
  includeGitLink,
  onGitLinkToggle
}) => {
  const [open, setOpen] = useState(false);
  const requestsLabelId = useId();

  return (
    <StyledWrapper className="advanced">
      <button
        type="button"
        className="advanced-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        data-testid="docs-advanced-toggle"
      >
        <IconChevronRight className="advanced-chevron" size={16} strokeWidth={1.36} aria-hidden="true" />
        <span className="advanced-label">Advanced</span>
      </button>

      <div className={`advanced-collapse ${open ? 'open' : ''}`} aria-hidden={!open} inert={!open}>
        <div className="advanced-collapse-inner">
          <div className="advanced-body">
            <section className="adv-section">
              <div className="adv-label" id={requestsLabelId}>
                <IconListCheck size={14} className="adv-label-icon" aria-hidden="true" />
                <span>Requests to include</span>
              </div>

              <div className="seg-row">
                <div className="segmented" role="group" aria-labelledby={requestsLabelId}>
                  <button
                    type="button"
                    aria-pressed={!filterByTags}
                    className={`seg ${!filterByTags ? 'active' : ''}`}
                    onClick={() => onFilterModeChange(false)}
                    data-testid="docs-requests-all"
                  >
                    All requests
                  </button>
                  <button
                    type="button"
                    aria-pressed={filterByTags}
                    className={`seg ${filterByTags ? 'active' : ''}`}
                    onClick={() => onFilterModeChange(true)}
                    data-testid="docs-requests-filter"
                  >
                    Filter by Tags
                    <span
                      className="seg-hint"
                      data-tooltip-id="docs-tags-hint"
                      data-tooltip-content={TAGS_HINT}
                    >
                      <IconInfoCircle size={16} aria-hidden="true" />
                    </span>
                  </button>
                </div>
              </div>

              <Tooltip id="docs-tags-hint" className="adv-hint-tooltip" />

              {filterByTags && (
                <IncludeExcludeTags
                  className="adv-tags"
                  tags={tags}
                  availableTags={availableTags}
                  onChange={onTagsChange}
                />
              )}
            </section>

            <section className="adv-section">
              <div className="adv-row">
                <div className="adv-label mb-0">
                  <IconGitBranch size={16} className="adv-label-icon" aria-hidden="true" />
                  <span>Include git repo URL</span>
                </div>
                <label className="adv-toggle">
                  <span className="toggle-label">Show</span>
                  <ToggleSwitch isOn={includeGitLink} handleToggle={onGitLinkToggle} size="xs" />
                </label>
              </div>
              <p className="adv-desc">Adds the repository link so readers can clone your collection in Bruno.</p>
            </section>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Advanced;
