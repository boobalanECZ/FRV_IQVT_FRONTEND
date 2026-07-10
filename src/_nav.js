import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilUser,
  cilBuilding,
  cilSettings,
  cilDescription,
  cilBarcode,
  cilArrowThickRight,
  cilChartLine,
  cilEnvelopeClosed,
} from '@coreui/icons'

import './assets/CSS/user.css'
import { CNavGroup, CNavItem } from '@coreui/react'

const _nav = [
  {
    component: CNavGroup,
    name: 'Masters',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'User Master',
        to: '/masters/users',
        icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
      },
      {
        component: CNavItem,
        name: 'Customer Master',
        to: '/masters/company',
        icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Scan Invoice',
    to: '/transaction/scaninvoice',
    icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Part Scan',
    to: '/transaction/partscan',
    icon: <CIcon icon={cilBarcode} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Gate Exit',
    to: '/transaction/gateexit',
    icon: <CIcon icon={cilArrowThickRight} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Reports',
    to: '/report/reports',
    icon: <CIcon icon={cilChartLine} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Mail Settings',
    to: '/masters/mailsetting',
    icon: <CIcon icon={cilEnvelopeClosed} customClassName="nav-icon" />,
  },
]

export default _nav

