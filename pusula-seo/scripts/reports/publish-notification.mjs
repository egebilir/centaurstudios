#!/usr/bin/env node
/**
 * Builds the Telegram text for a publish success or a validation failure.
 * This is the "notify me if something fails" mechanism from the brief —
 * a failure here means nothing was published, so it's flagged as a safety
 * signal, not routine noise (see format.formatFailure).
 */
import { publicUrlFor, clusterHubUrl } from '../lib/paths.mjs';
import { readJSON } from '../lib/json-store.mjs';
import { DATA_DIR } from '../lib/paths.mjs';
import path from 'node:path';
import { formatPublishSuccess, formatFailure } from '../telegram/format.mjs';
import { isMain } from '../lib/cli.mjs';

export function buildPublishSuccessMessage(content, { whyNow } = {}) {
  const clustersMeta = readJSON(path.join(DATA_DIR, 'clusters.json'));
  const clusterMeta = clustersMeta.clusters.find((c) => c.slug === content.cluster);
  return formatPublishSuccess({
    title: content.title,
    url: publicUrlFor(content.content_type, content.slug),
    cluster: clusterMeta ? clusterMeta.name : content.cluster,
    whyNow
  });
}

export function buildPublishFailureMessage(topic, validationResult) {
  return formatFailure({
    what: topic?.primary_keyword || topic?.id || 'bilinmeyen konu',
    reason: validationResult.errors.join('\n'),
    articleSlug: topic?.slug || topic?.id
  });
}

if (isMain(import.meta.url)) {
  console.log('This module exports buildPublishSuccessMessage/buildPublishFailureMessage — see RUNBOOK.md for usage in the publish pipeline.');
}
