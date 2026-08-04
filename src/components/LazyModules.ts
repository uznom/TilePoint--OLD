import React from 'react';

// Lazy-loaded routes and heavy modules for code splitting

export const LazyDashboard = React.lazy(() =>
  import('./Dashboard').then((m) => ({ default: m.Dashboard }))
);

export const LazyAdminProfitModule = React.lazy(() =>
  import('./AdminProfitModule').then((m) => ({ default: m.AdminProfitModule }))
);

export const LazyPosModule = React.lazy(() =>
  import('./PosModule').then((m) => ({ default: m.PosModule }))
);

export const LazyInventoryModule = React.lazy(() =>
  import('./InventoryModule').then((m) => ({ default: m.InventoryModule }))
);

export const LazyProcurementModule = React.lazy(() =>
  import('./ProcurementModule').then((m) => ({ default: m.ProcurementModule }))
);

export const LazyTransmittalModule = React.lazy(() =>
  import('./TransmittalModule').then((m) => ({ default: m.TransmittalModule }))
);

export const LazyShiftModule = React.lazy(() =>
  import('./ShiftModule').then((m) => ({ default: m.ShiftModule }))
);

export const LazyBranchModule = React.lazy(() =>
  import('./BranchModule').then((m) => ({ default: m.BranchModule }))
);

export const LazyUsersModule = React.lazy(() =>
  import('./UsersModule').then((m) => ({ default: m.UsersModule }))
);

export const LazySystemSettingsModule = React.lazy(() =>
  import('./SystemSettingsModule').then((m) => ({ default: m.SystemSettingsModule }))
);

export const LazyCalculatorModule = React.lazy(() =>
  import('./CalculatorModule').then((m) => ({ default: m.CalculatorModule }))
);

export const LazyStaffPortal = React.lazy(() =>
  import('./StaffPortal').then((m) => ({ default: m.StaffPortal }))
);

export const LazyAtposExtraModules = React.lazy(() =>
  import('./AtposExtraModules')
);

export const LazyDeliveriesModule = React.lazy(() =>
  import('./DeliveriesModule').then((m) => ({ default: m.DeliveriesModule }))
);

export const LazySalesTransmissionModule = React.lazy(() =>
  import('./SalesTransmissionModule').then((m) => ({ default: m.SalesTransmissionModule }))
);

export const LazyDailyReconciliationModule = React.lazy(() =>
  import('./DailyReconciliationModule').then((m) => ({ default: m.DailyReconciliationModule }))
);

export const LazyReconciliationTransmissionModule = React.lazy(() =>
  import('./ReconciliationTransmissionModule').then((m) => ({ default: m.ReconciliationTransmissionModule }))
);

export const LazyDamageRegisterModule = React.lazy(() =>
  import('./DamageRegisterModule').then((m) => ({ default: m.DamageRegisterModule }))
);
