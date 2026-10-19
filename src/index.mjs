/**
 * dsh-english-learn — Host half.
 *
 * The whole feature is browser-side: vocabulary, scheduling, spelling practice
 * and review all run in the client bundle, and learner progress lives in the
 * GUI's localStorage. This half exists so the profile row is a valid Cordis
 * plugin and so the bundle's `dsh.client` declaration has a Host counterpart
 * to pair with.
 *
 * No Config is declared on purpose: a Host Config would make DSH generate its
 * own settings page for this row, which would sit beside the `settings.section`
 * page the client half already registers.
 * @module dsh-english-learn
 */

/** Stable plugin name; the composition row references the package by name. */
export const name = 'dsh-english-learn'

/** No Host services are required. */
export const inject = []

/**
 * Activate the Host half.
 * @param {import('@deepseek-ai/cordis').Context} ctx - plugin context.
 */
export function apply(ctx) {
  // Intentionally empty: the browser half owns every behaviour. The reference
  // keeps the parameter meaningful for future Host-side storage of progress.
  void ctx
}
