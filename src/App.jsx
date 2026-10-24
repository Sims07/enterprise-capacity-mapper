import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DEMO_MODEL } from './data/demoData.js';
import { createFrontendApplication } from './adapters/react/architecture.js';
import {
  addLayoutDraftItem,
  isDomainPlacementAvailable,
  prepareLayoutForSave,
  prepareDomainPlacement,
  removeLayoutDraftItem,
  renameLayoutDraftItem,
  renameLayoutZone,
} from './application/layoutUseCases.js';
import {
  assignApplicationToCapability,
  linkPickedApplications,
  prepareLinkedApplications,
  unassignApplicationFromCapability,
} from './application/relationshipUseCases.js';
import {
  createApplication,
  createCapability,
  createDomain,
  removeDomainAndDependents,
  updateCapability,
  updateDomain,
} from './application/catalogUseCases.ts';
import { deriveCoverageOverview, getCapabilityCoverageState } from './application/coverageUseCases.ts';
import NewMapWizard from './components/NewMapWizard.jsx';
import TogafGuide from './components/TogafGuide.jsx';
import CoverageTree from './components/CoverageTree.jsx';