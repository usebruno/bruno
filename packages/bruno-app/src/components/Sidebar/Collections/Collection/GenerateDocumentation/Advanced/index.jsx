import React, { useId, useState } from 'react';
import { IconChevronRight, IconListCheck, IconGitBranch, IconInfoCircle } from '@tabler/icons';
import { Tooltip } from 'react-tooltip';
import ToggleSwitch from 'components/ToggleSwitch';
import RadioButton from 'components/RadioButton';
import IncludeExcludeTags from './IncludeExcludeTags';
import StyledWrapper from './StyledWrapper';

const TAGS_HINT = 'Tags are labels on requests and folders (e.g. smoke, WIP), and a request also matches its folders\' tags. Manage them in Request › Settings and Folder › Settings';

const Advanced = ({
  filterByTags,
  onFilterModeChange,
  tags,
  availableTags,
  onTagsChange,
  includeGitLink,
  onGitLinkToggle,
  hasGitUrl
}) => {
  const [open, setOpen] = useState(false);
  const requestsLabelId = useId();
  const requestsModeName = useId();
  const allRequestsId = useId();
  const filterByTagsId = useId();

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

              <div className="adv-radio-group" role="radiogroup" aria-labelledby={requestsLabelId}>
                <div className="adv-radio">
                  <RadioButton
                    id={allRequestsId}
                    name={requestsModeName}
                    checked={!filterByTags}
                    onChange={() => onFilterModeChange(false)}
                    dataTestId="docs-requests-all"
                  />
                  <label htmlFor={allRequestsId} className="adv-radio-label">
                    All requests
                  </label>
                </div>
                <div className="adv-radio">
                  <RadioButton
                    id={filterByTagsId}
                    name={requestsModeName}
                    checked={filterByTags}
                    onChange={() => onFilterModeChange(true)}
                    dataTestId="docs-requests-filter"
                  />
                  <label htmlFor={filterByTagsId} className="adv-radio-label">
                    Filter by Tags
                  </label>
                  <span
                    className="adv-radio-hint"
                    data-tooltip-id="docs-tags-hint"
                    data-tooltip-content={TAGS_HINT}
                  >
                    <IconInfoCircle size={16} aria-hidden="true" />
                  </span>
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

            {hasGitUrl && (
              <section className="adv-section" data-testid="docs-git-link">
                <div className="adv-row">
                  <div className="adv-label mb-0">
                    <IconGitBranch size={16} className="adv-label-icon" aria-hidden="true" />
                    <span>Include Git repo URL</span>
                  </div>
                  <label className="adv-toggle" data-testid="docs-git-link-toggle">
                    <span className="toggle-label">Show</span>
                    <ToggleSwitch isOn={includeGitLink} handleToggle={onGitLinkToggle} size="xs" />
                  </label>
                </div>
                <p className="adv-desc">Adds the repository link so readers can clone your collection in Bruno.</p>
              </section>
            )}
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Advanced;
