import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilChevronLeft, cilChevronRight, cilAccountLogout } from '@coreui/icons';
import { AppSidebarNav } from './AppSidebarNav';
import usePrivilege from '../../src/views/hooks/usePrivilege';
import { useNavigate } from 'react-router-dom';
import faureciaLogo from '../assets/images/faurecia.png';
import API from '../api.js';

import navigation from '../_nav'
const AppSidebar = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { canView } = usePrivilege()

  const filteredNav = navigation
    .filter((item) => {
      if (item.name === 'Dashboard') {
        return canView('Dashboard')
      }

      if (item.items) {
        return true
      }

      if (item.children) {
        return (
          canView(item.name) ||
          item.children.some((child) => canView(child.name))
        )
      }

      return canView(item.name)
    })
    .map((item) => {
      if (item.items) {
        return {
          ...item,
          items: item.items.filter((sub) => canView(sub.name)),
        }
      }

      if (item.children) {
        return {
          ...item,
          children: item.children.filter((child) =>
            canView(child.name),
          ),
        }
      }

      return item
    })
    .filter((item) => {
      if (item.items) {
        return item.items.length > 0
      }

      if (item.children) {
        return item.children.length > 0
      }

      return true
    })
  // const handleLogout = () => {
  //   sessionStorage.removeItem('user')
  //   window.dispatchEvent(new Event('storage'))
  //   navigate('/login', { replace: true })
  // }


  const handleLogout = async () => {
    try {
        await API.post("/Auth/logout");
    }
    catch { }
    sessionStorage.clear();
    navigate("/login");
};
  return (
   <CSidebar
  className="custom-sidebar"
  colorScheme="dark"
  position="fixed"
  unfoldable={unfoldable}
  visible={sidebarShow}
  onVisibleChange={(visible) => {
    dispatch({ type: 'set', sidebarShow: visible })
  }}
>
  <CSidebarHeader className="border-bottom">
  <CSidebarBrand className="sidebar-logo-container">
    <img
      src={faureciaLogo}
      alt="FORVIA"
      className="sidebar-logo"
    />
  </CSidebarBrand>
</CSidebarHeader>

  <AppSidebarNav items={filteredNav} />

  <CSidebarFooter className="custom-sidebar-footer">
    <button
      type="button"
      className="logout-button"
      onClick={handleLogout}
    >
      <CIcon icon={cilAccountLogout} className="logout-icon" />
      <span className="logout-text">Logout</span>
    </button>
  </CSidebarFooter>
</CSidebar>
  )
}

export default React.memo(AppSidebar)
