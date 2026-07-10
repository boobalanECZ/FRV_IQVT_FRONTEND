import React from 'react'

// const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const Users = React.lazy(() => import('./views/masters/users'));
const Company = React.lazy(() => import('./views/masters/company'));
const  PartScan = React.lazy(() => import('./views/transaction/partscan'));
const  GateExit = React.lazy(() => import('./views/transaction/gateexit'));
const  ScanInvoice = React.lazy(() => import('./views/transaction/scaninvoice'));
const  Reports = React.lazy(() => import('./views/report/reports'));
const  MailSettings = React.lazy(() => import('./views/masters/mailsetting'));
const routes = [
  { path: '/', exact: true, name: 'Home' },
  // { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/masters/users', name: 'User Master', element: Users },
  { path: '/masters/company', name: 'Customer Master', element: Company },
  { path: '/masters/mailsetting', name: 'Mail Settings', element: MailSettings },
  { path: '/transaction/partscan', name: 'Part Scan', element: PartScan },
  { path: '/transaction/gateexit', name: 'Gate Exit', element: GateExit },
  { path: '/transaction/scaninvoice', name: 'Scan Invoice', element: ScanInvoice },
  { path: '/report/reports', name: 'Reports', element: Reports },
 
]

export default routes
