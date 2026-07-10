import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CButton, CForm, CFormInput } from '@coreui/react';
import './Login.css'
import truckImg from '../../../assets/images/truck.png';
import API from '../../../api.js';
import { v4 as uuidv4 } from "uuid";

const Login = () => {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    username: '',
    password: '',
    mobilityWithoutCheck: false,
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  function getDeviceId() {
    let id = localStorage.getItem("deviceId");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("deviceId", id);
    }
    return id;
  }

  const handleLogin = async (e) => {
    debugger;
    e.preventDefault()
    if (!form.username || !form.password) {
      toast.error('Please enter username & password')
      return
    }
    try {

      const request = {
        username: form.username,
        password: form.password,
        mobilityWithoutCheck: form.mobilityWithoutCheck,
        deviceId: getDeviceId()
      };
      const res = await API.post('/Auth/login', request);

      if (res.data.alreadyLoggedIn) {
        toast.warning(res.data.message);
        return;
      }

      if (!res.data.user) {
        toast.error(res.data.message || "Login Failed");
        return;
      }

      const userData = {
        id: res.data.user.id,
        username: res.data.user.userName,
        departmentId: res.data.user.departmentId,
        departmentName: res.data.user.departmentName,
        gateId: res.data.user.gateId,
        sessionId: res.data.sessionId
      };

      sessionStorage.setItem("user", JSON.stringify(userData))
      window.dispatchEvent(new Event('storage'))
      toast.success('Login Successful')
      const isMobile = !form.mobilityWithoutCheck
      if (form.mobilityWithoutCheck) {
        navigate('/masters/users')
      } else {
        navigate('/m/send')
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        err.message ||
        "Login Failed"
      );
    }
  }

  return (
    <div className="lg-root">
      <div className="lg-left">
        <img
          src={truckImg}
          alt="FORVIA"
          className="lg-truck-img"
        />
      </div>
      <div className="lg-right">
        <div className="lg-card">
          <div className="forvia-logo-circle">
            <div className="forvia-logo">
              F
              <span className="forvia-dot"></span>
            </div>
          </div>
          <h2 className="lg-title">
            Welcome Back!
          </h2>

          <p className="lg-subtitle">
            Sign in to continue to your Forvia Faurecia portal
          </p>

          <CForm onSubmit={handleLogin} className="lg-form">
            <div className="lg-field">
              <label className="lg-label">Username</label>
              <div className="lg-input-wrap">
                <svg
                  className="lg-input-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <CFormInput
                  name="username"
                  placeholder="Enter User ID / Employee ID / Email / User Name"
                  value={form.username || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      username: e.target.value,
                    })
                  }
                  className="lg-input"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="lg-field">
              <label className="lg-label">Password</label>
              <div className="lg-input-wrap">
                <svg
                  className="lg-input-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <CFormInput
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password: e.target.value,
                    })
                  }
                  placeholder="Enter your password"
                  className="lg-input lg-input-pw"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="lg-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="lg-mobility-row">
              <label className="lg-check-label">
                <input
                  type="checkbox"
                  name="mobilityWithoutCheck"
                  checked={form.mobilityWithoutCheck}
                  onChange={handleChange}
                  className="lg-checkbox"
                />
                For Mobility Without Check
              </label>
            </div>

            <CButton type="submit" className="lg-btn" onClick={handleLogin}>
              SIGN IN &nbsp;→
            </CButton>
          </CForm>

          <div className="lg-footer-info">
            <p className="lg-copyright">
              © 2026 IQVT. All rights reserved.
            </p>
            <p className="lg-version">
              Version 1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
