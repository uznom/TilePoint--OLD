/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Material Design 3 (M3) Dynamic Theme Diagnostics Utility
 * Run this in the browser dev console via: window.diagnoseTheme()
 */
export const diagnoseTheme = () => {
 const report: any = {
 timestamp: new Date().toISOString(),
 url: window.location.href,
 localStorage: {},
 rootCssVariables: {},
 cssPropagationChecks: {
 catalogTable: { passed: true, details: [] },
 adjustmentsTable: { passed: true, details: [] },
 suppliersTable: { passed: true, details: [] },
 branchCards: { passed: true, details: [] },
 idleClock: { passed: true, details: [] }
 },
 recommendations: []
 };

 // 1. Audit localStorage configurations
 const storageKeys = [
 'tilepoint_custom_theme_primary',
 'tilepoint_dark_theme',
 'tilepoint-color-contrast',
 'tilepoint-disable-animations',
 'tilepoint-disable-blurs',
 'tilepoint-maximize-text-contrast'
 ];
 
 storageKeys.forEach(key => {
 report.localStorage[key] = localStorage.getItem(key);
 });

 // 2. Audit root CSS Variables
 const root = document.documentElement;
 const computedStyle = getComputedStyle(root);
 const m3Variables = [
 '--m3-primary',
 '--m3-on-primary',
 '--m3-primary-rgb',
 '--m3-secondary',
 '--m3-tertiary',
 '--m3-surface',
 '--m3-on-surface',
 '--m3-on-surface-variant',
 '--m3-surface-container-lowest',
 '--m3-surface-container-low',
 '--m3-surface-container',
 '--m3-surface-container-high',
 '--m3-outline',
 '--m3-outline-variant'
 ];

 m3Variables.forEach(v => {
 report.rootCssVariables[v] = {
 inlineValue: root.style.getPropertyValue(v) || 'none (falls back to stylesheet)',
 computedValue: computedStyle.getPropertyValue(v).trim()
 };
 });

 const primaryValue = report.rootCssVariables['--m3-primary'].computedValue;
 const isDefaultBlue = primaryValue === '#155EEF' || primaryValue === '#3B82F6' || primaryValue.toLowerCase() === 'rgb(21, 94, 239)' || primaryValue.toLowerCase() === 'rgb(59, 130, 246)';
 
 // 3. Diagnose Specific Component Containers
 const auditElementColor = (selector: string, componentName: keyof typeof report.cssPropagationChecks) => {
 const el = document.querySelector(selector);
 const compCheck = report.cssPropagationChecks[componentName];
 
 if (!el) {
 compCheck.passed = false;
 compCheck.details.push(`No active element found in the DOM for selector "${selector}". (The component is likely unmounted or currently inactive).`);
 return;
 }

 compCheck.details.push(`Found active DOM container: ${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`);
 
 // Check class names for hardcoded blue/indigo/sky/cyan overrides
 const classes = Array.from(el.classList);
 const legacyBlueClasses = classes.filter(c => c.match(/(blue|sky|indigo|cyan|slate)-(400|500|600|700|800|900|950)/));
 if (legacyBlueClasses.length > 0) {
 compCheck.passed = false;
 compCheck.details.push(`CRITICAL: Hardcoded color overrides detected in classList: ${legacyBlueClasses.join(', ')}`);
 } else {
 compCheck.details.push(`Clean class list validated: No hardcoded color utility overrides.`);
 }

 // Inspect computed CSS variables propagation
 const elComputed = getComputedStyle(el);
 const propagatedPrimary = elComputed.getPropertyValue('--m3-primary').trim();
 if (propagatedPrimary === primaryValue) {
 compCheck.details.push(`Passed: '--m3-primary' successfully propagated down to container. Active color value: "${propagatedPrimary}"`);
 } else {
 compCheck.passed = false;
 compCheck.details.push(`ERROR: '--m3-primary' variable shadow-blocked or modified! Expected: "${primaryValue}", Computed: "${propagatedPrimary}"`);
 }
 };

 // Run audit on components (using standard selectors based on current page views)
 auditElementColor('#idle-screen-adaptive-clock', 'idleClock');
 auditElementColor('.m3-card', 'branchCards'); // Checks any branch card
 auditElementColor('table', 'catalogTable'); // Checks standard table container

 // 4. Formulate Actionable Recommendations
 if (isDefaultBlue && !report.localStorage['tilepoint_custom_theme_primary']) {
 report.recommendations.push(
 `INFO: The active theme seed is currently DEFAULT Sapphire Blue. It is expected that elements display blue shades until a custom preset (like Forest, Velvet, Teal) or a custom HEX code is selected in the Privacy & Accessibility Hub.`
 );
 }

 if (report.localStorage['tilepoint_custom_theme_primary']) {
 const savedSeed = report.localStorage['tilepoint_custom_theme_primary'];
 report.recommendations.push(
 `VERIFIED: A custom theme seed "${savedSeed}" is active. Ensure target elements use M3 color classes (e.g., bg-m3-primary, border-m3-outline-variant, text-m3-on-surface) to fully propagate this custom theme.`
 );
 } else {
 report.recommendations.push(
 `TIP: To test dynamic theme propagation, open the Privacy & Accessibility Hub sidebar, choose the Forest (Green) or Velvet (Red) preset, and verify that the layout and components instantly shift theme color.`
 );
 }

 // Print results neatly in the console
 console.log("%c════════════════════════════════════════════════════", "color: #155EEF; font-weight: bold;");
 console.log("%c MATERIAL 3 DYNAMIC THEME PROPAGATION DIAGNOSTICS", "color: #155EEF; font-weight: 900; font-size: 14px;");
 console.log("%c════════════════════════════════════════════════════", "color: #155EEF; font-weight: bold;");
 console.log("Current Theme Primary Color:", primaryValue);
 console.log("Is Default Blue Mode Active:", isDefaultBlue);
 console.log("Diagnostics Detailed Payload:", report);
 
 if (report.recommendations.length > 0) {
 console.log("%c Recommendations:", "color: #D97706; font-weight: bold;");
 report.recommendations.forEach((rec: string, i: number) => console.log(` ${i+1}. ${rec}`));
 }
 
 console.log("%c════════════════════════════════════════════════════", "color: #155EEF; font-weight: bold;");

 return report;
};

// Expose to window on import
if (typeof window !== 'undefined') {
 (window as any).diagnoseTheme = diagnoseTheme;
}
