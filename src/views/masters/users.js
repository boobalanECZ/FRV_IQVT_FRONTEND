import React, { useEffect, useState, useRef } from 'react'
import DataTable from 'react-data-table-component'
import {
  CButton,
  CFormInput,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import { FaEdit, FaTrash, FaUsers, FaEye, FaEyeSlash, FaSave } from 'react-icons/fa'
import { toast } from 'react-toastify'
import API from '../../api.js'
import '../../assets/CSS/user.css'
import { MENU_CONFIG } from '../menuConfig.js'
import CIcon from '@coreui/icons-react'
import usePrivilege from '../hooks/usePrivilege.js'
import CreatableSelect from 'react-select/creatable'

const UserMaster = () => {
  const userRef = useRef()

  const customStyles = {
    rows: { style: { minHeight: '34px' } },
    headCells: {
      style: {
        justifyContent: 'center',
        fontSize: '14px',
        paddingTop: '2px',
        paddingBottom: '2px',
      },
    },
    cells: {
      style: {
        justifyContent: 'center',
        fontSize: '13px',
        paddingTop: '0px',
        paddingBottom: '0px',
      },
    },
  }

  const [users, setUsers] = useState([])
  const [form, setForm] = useState({
    userId: '',
    employeeId: '',
    userName: '',
    departmentId: '',
    gateId: '',
    password: '',
    confirmPassword: '',
  })

  const [errors, setErrors] = useState({
    userId: '',
    userName: '',
    employeeId: '',
    departmentId: '',
    gateId: '',
    password: '',
    confirmPassword: '',
  })

  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPrivilegeModal, setShowPrivilegeModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [privileges, setPrivileges] = useState([])
  const [departments, setDepartments] = useState([])
  const [deleteUser, setDeleteUser] = useState(null)
  const [departmentInput, setDepartmentInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { privileges: userPrivileges = [] } = usePrivilege()
  const uPrivilege = userPrivileges.find((p) => p.menuName === 'User Master') || {}

  const sessionUser = JSON.parse(sessionStorage.getItem('user') || 'null')
  const isAdminDepartment = sessionUser?.departmentName?.toUpperCase() === 'ADMIN'

  useEffect(() => {
    loadUsers()
    loadDepartments()

    setTimeout(() => {
      userRef.current?.focus()
    }, 200)
  }, [])

  const clearError = (name) => {
    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }))
  }

  const capitalizeFirstLetter = (value) => {
    if (!value) return ''
    return value.charAt(0).toUpperCase() + value.slice(1)
  }

  const loadUsers = async () => {
    try {
      const res = await API.get('/users')
      setUsers(res.data || [])
    } catch {
      toast.error('Failed to load users')
    }
  }

  const loadDepartments = async () => {
    try {
      const res = await API.get('/users/departments')
      setDepartments(res.data || [])
    } catch {
      toast.error('Failed to load departments')
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === 'userName') {
      const cleanValue = value.replace(/[^A-Za-z ]/g, '')

      setForm({
        ...form,
        userName: capitalizeFirstLetter(cleanValue),
      })

      clearError('userName')
      return
    }

    setForm({
      ...form,
      [name]: value,
    })

    clearError(name)
  }

  const validate = () => {
    const temp = {
      userId: '',
      userName: '',
      employeeId: '',
      departmentId: '',
      gateId: '',
      password: '',
      confirmPassword: '',
    }

    const userId = form.userId.trim()
    const userName = form.userName.trim()
    const employeeId = form.employeeId.trim()

    if (!userId) {
      temp.userId = 'User ID is required'
    } else if (
      users.some(
        (u) =>
          u.userId?.trim().toLowerCase() === userId.toLowerCase() &&
          u.id !== editId,
      )
    ) {
      temp.userId = 'User ID already exists'
    }

    if (!userName) {
      temp.userName = 'User Name is required'
    } else if (!/^[A-Za-z ]+$/.test(userName)) {
      temp.userName = 'User Name only allows letters'
    } else if (
      users.some(
        (u) =>
          u.userName?.trim().toLowerCase() === userName.toLowerCase() &&
          u.id !== editId,
      )
    ) {
      temp.userName = 'User Name already exists'
    }

    if (!employeeId) {
  temp.employeeId = 'Employee ID is required'
} else if (!/^[A-Z0-9]+$/.test(employeeId)) {
  temp.employeeId =
    'Employee ID can contain only capital letters and numbers'
}else if (
      users.some(
        (u) =>
          u.employeeId?.trim().toLowerCase() === employeeId.toLowerCase() &&
          u.id !== editId,
      )
    ) {
      temp.employeeId = 'Employee ID already exists'
    }

    if (!form.departmentId && !departmentInput) {
      temp.departmentId = 'Department is required'
    }

    if (!form.gateId?.trim()) {
      temp.gateId = 'Gate is required'
    }

    if (!form.password) {
      temp.password = 'Password is required'
    }

    if (!form.confirmPassword) {
      temp.confirmPassword = 'Confirm Password is required'
    } else if (form.password !== form.confirmPassword) {
      temp.confirmPassword = 'Password mismatch'
    }

    setErrors(temp)

    return !Object.values(temp).some((x) => x)
  }

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      const payload = {
        userCode: form.userId.trim(),
        userName: form.userName.trim(),
        employeeId: form.employeeId.trim(),
        departmentId: form.departmentId === 'NEW' ? 0 : Number(form.departmentId),
        departmentName: departmentInput,
        gateId: form.gateId,
        passwordHash: form.password,
      }

      let res

      if (editId) {
        await API.put(`/users/${editId}`, payload)
        toast.success('User Updated Successfully')
      } else {
        res = await API.post('/users', payload)
        toast.success('User Saved Successfully')

        if (res?.data?.id) {
          openPrivilege(res.data)
        }
      }

      await loadUsers()
      resetForm()
    } catch (err) {
      toast.error(err?.response?.data || 'Save Failed')
    }
  }

  const openPrivilege = async (user) => {
    setSelectedUser(user)

    const res = await API.get(`/users/privileges/${user.id}`)

    const mapped = MENU_CONFIG.flatMap((menu) => {
      const menus = []

      if (!menu.items) {
        menus.push(menu)
      }

      if (menu.items) {
        menus.push(...menu.items)
      }

      return menus.map((m) => {
        const existing = res.data.find((x) => x.menuName === m.name)

        return {
          menuName: m.name,
          icon: m.icon,
          canView: existing?.canView || false,
          canEdit: existing?.canEdit || false,
          canDelete: existing?.canDelete || false,
        }
      })
    })

    setPrivileges(mapped)
    setShowPrivilegeModal(true)
  }

  const handleEdit = async (row) => {
    try {
      const res = await API.get(`/users/${row.id}`)

      setEditId(row.id)

      setForm({
        userId: capitalizeFirstLetter(res.data.userId || ''),
        userName: capitalizeFirstLetter(res.data.userName || res.data.UserName || ''),
        employeeId: (res.data.employeeId || res.data.EmployeeId || '').toUpperCase(),
        departmentId: res.data.departmentId || res.data.DepartmentId || '',
        gateId: res.data.gateId || res.data.GateId || '',
        password: res.data.password || res.data.Password || '',
        confirmPassword: res.data.password || res.data.Password || '',
      })

      setDepartmentInput(row.departmentName || '')
      setErrors({
        userId: '',
        userName: '',
        employeeId: '',
        departmentId: '',
        gateId: '',
        password: '',
        confirmPassword: '',
      })
    } catch {
      toast.error('Failed to load user')
    }
  }

  const handlePrivilegeChange = (index, field) => {
    if (index === -1) return

    const updated = [...privileges]

    if (field === 'all') {
      const val =
        !(updated[index].canView && updated[index].canEdit && updated[index].canDelete)

      updated[index] = {
        ...updated[index],
        canView: val,
        canEdit: val,
        canDelete: val,
      }
    } else if (field === 'canView') {
      updated[index].canView = !updated[index].canView
    } else if (field === 'canEdit') {
      updated[index].canEdit = !updated[index].canEdit
    } else if (field === 'canDelete') {
      updated[index].canDelete = !updated[index].canDelete
    }

    setPrivileges(updated)
  }

  const handleHeaderChange = (field, value) => {
    const updated = privileges.map((p) => {
      if (field === 'all') {
        return {
          ...p,
          canView: value,
          canEdit: value,
          canDelete: value,
        }
      }

      return {
        ...p,
        [field]: value,
      }
    })

    setPrivileges(updated)
  }

  const savePrivileges = async () => {
    const payload = privileges
      .filter((p) => p.canView || p.canEdit || p.canDelete)
      .map((p) => ({
        userId: selectedUser?.id,
        menuName: p.menuName,
        canView: p.canView,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
      }))

    if (payload.length === 0) {
      toast.error('Select at least one privilege')
      return
    }

    try {
      await API.post('/users/privileges', payload)
      toast.success('Privileges Saved')
      setShowPrivilegeModal(false)
    } catch (err) {
      toast.error(err?.response?.data || 'Failed to save privileges')
    }
  }

  const resetForm = () => {
    setForm({
      userId: '',
      employeeId: '',
      userName: '',
      departmentId: '',
      gateId: '',
      password: '',
      confirmPassword: '',
    })

    setErrors({
      userId: '',
      userName: '',
      employeeId: '',
      departmentId: '',
      gateId: '',
      password: '',
      confirmPassword: '',
    })

    setEditId(null)
    setDepartmentInput('')
    setShowPassword(false)
    setShowConfirmPassword(false)

    setTimeout(() => {
      userRef.current?.focus()
    }, 100)
  }

  const confirmDelete = async () => {
    try {
      await API.delete(`/users/${deleteId}`)
      toast.success('Deleted Successfully')
      resetForm()
      await loadUsers()
    } catch (err) {
      console.log(err)
      toast.error('Delete Failed')
    } finally {
      setShowDeleteModal(false)
      setDeleteId(null)
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      (u.userName || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.userId || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.employeeId || '').toLowerCase().includes(search.toLowerCase()),
  )

    if (!uPrivilege.canView) {
    return (
     <></>
    )
  }

  const columns = [
    {
      name: 'S.NO',
      selector: (row, index) => index + 1,
    },
    {
      name: 'USER NAME',
      selector: (row) => row.userName,
    },
    {
      name: 'USER ID',
      selector: (row) => row.userId,
    },
    {
      name: 'EMPLOYEE ID',
      selector: (row) => row.employeeId,
    },
    {
      name: 'DEPARTMENT',
      selector: (row) => row.departmentName,
    },
    {
      name: 'GATE NO',
      selector: (row) => row.gateName,
    },
    {
      name: 'ACTIONS',
      center: true,
      cell: (row) => (
        <div className="action-wrapper">
          {uPrivilege?.canEdit && (
            <button
              className="table-action-btn edit-btn"
              title="Edit"
              onClick={() => handleEdit(row)}
            >
              <FaEdit />
            </button>
          )}

          {uPrivilege?.canDelete && (
            <button
              className="table-action-btn delete-btn"
              title="Delete"
              onClick={() => {
                setDeleteId(row.id)
                setDeleteUser(row)
                setShowDeleteModal(true)
              }}
            >
              <FaTrash />
            </button>
          )}

          {isAdminDepartment && (
            <button
              className="table-action-btn privilege-btn"
              title="Privileges"
              onClick={() => openPrivilege(row)}
            >
              <FaUsers />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="user-master-page">
      <CCard className="user-form-card">
        <CCardBody>
          <div className="section-title">USER DETAILS</div>

          <CRow className="g-3">
            <CCol md={3}>
              <label className="custom-label">
                User ID <span className="required">*</span>
              </label>

              <CFormInput
                ref={userRef}
                placeholder="Enter User ID"
                value={form.userId}
                className={errors.userId ? 'error-input' : ''}
                onChange={(e) => {
                  setForm({
                    ...form,
                    userId: capitalizeFirstLetter(e.target.value),
                  })
                  clearError('userId')
                }}
              />

              {errors.userId && (
                <small className="text-danger">{errors.userId}</small>
              )}
            </CCol>

            <CCol md={3}>
              <label className="custom-label">
                User Name <span className="required">*</span>
              </label>

              <CFormInput
                placeholder="Enter User Name"
                value={form.userName}
                name="userName"
                className={errors.userName ? 'error-input' : ''}
                onChange={handleChange}
              />

              {errors.userName && (
                <small className="text-danger">{errors.userName}</small>
              )}
            </CCol>

            <CCol md={3}>
              <label className="custom-label">
                Employee ID <span className="required">*</span>
              </label>

             <CFormInput
  placeholder="Enter Employee ID"
  value={form.employeeId}
  className={errors.employeeId ? 'error-input' : ''}
  onChange={(e) => {
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '') // only A-Z and 0-9

    setForm({
      ...form,
      employeeId: value,
    })

    clearError('employeeId')
  }}
/>

              {errors.employeeId && (
                <small className="text-danger">{errors.employeeId}</small>
              )}
            </CCol>

            <CCol md={3}>
              <label className="custom-label">
                Department <span className="required">*</span>
              </label>

              <div className={errors.departmentId ? 'react-select-error' : ''}>
                <CreatableSelect
                  classNamePrefix="react-select"
                  options={departments}
                  value={
                    form.departmentId === 0
                      ? {
                          value: 0,
                          label: departmentInput,
                        }
                      : departments.find(
                          (x) => String(x.value) === String(form.departmentId),
                        ) || null
                  }
                  onChange={(selected) => {
                    setForm({
                      ...form,
                      departmentId: selected?.value || '',
                    })

                    setDepartmentInput((selected?.label || '').toUpperCase())
                    clearError('departmentId')
                  }}
                  onCreateOption={(inputValue) => {
                    const upperValue = inputValue.toUpperCase()

                    setDepartmentInput(upperValue)

                    setForm({
                      ...form,
                      departmentId: 0,
                    })

                    clearError('departmentId')
                  }}
                  formatCreateLabel={(inputValue) =>
                    `Create "${inputValue.toUpperCase()}"`
                  }
                />
              </div>

              {errors.departmentId && (
                <small className="text-danger">{errors.departmentId}</small>
              )}
            </CCol>

            <CCol md={3}>
              <label className="custom-label">
                Gate No <span className="required">*</span>
              </label>

              <CFormInput
                placeholder="Enter Gate"
                value={form.gateId}
                className={errors.gateId ? 'error-input' : ''}
                onChange={(e) => {
                  setForm({
                    ...form,
                    gateId: e.target.value.toUpperCase(),
                  })
                  clearError('gateId')
                }}
              />

              {errors.gateId && (
                <small className="text-danger">{errors.gateId}</small>
              )}
            </CCol>

            <CCol md={3}>
              <label className="custom-label">
                Password <span className="required">*</span>
              </label>

              <div style={{ position: 'relative' }}>
                <CFormInput
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Password"
                  value={form.password}
                  className={errors.password ? 'error-input' : ''}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      password: e.target.value,
                    })
                    clearError('password')
                    clearError('confirmPassword')
                  }}
                />

                <span
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer',
                    color: '#666',
                  }}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              {errors.password && (
                <small className="text-danger">{errors.password}</small>
              )}
            </CCol>

            <CCol md={3}>
              <label className="custom-label">
                Confirm Password <span className="required">*</span>
              </label>

              <div style={{ position: 'relative' }}>
                <CFormInput
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  value={form.confirmPassword}
                  className={errors.confirmPassword ? 'error-input' : ''}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      confirmPassword: e.target.value,
                    })
                    clearError('confirmPassword')
                  }}
                />

                <span
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer',
                    color: '#666',
                  }}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              {errors.confirmPassword && (
                <small className="text-danger">{errors.confirmPassword}</small>
              )}
            </CCol>
          </CRow>

          <div className="form-button-area">
            <CButton
              className={editId ? 'update-btn' : 'save-btn'}
              onClick={handleSubmit}
            >
              <FaSave className="me-2" />
              {editId ? 'UPDATE' : 'SAVE'}
            </CButton>

            <CButton className="clear-btn" onClick={resetForm}>
              CANCEL
            </CButton>
          </div>
        </CCardBody>
      </CCard>

      <CCard className="mt-3">
        <CCardBody>
          <div className="table-header">
            <div className="table-title">USER LIST</div>

            <CFormInput
              placeholder="Search..."
              className="search-box"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <DataTable
            columns={columns}
            data={filteredUsers}
            pagination
            striped
            responsive
            highlightOnHover
            customStyles={customStyles}
          />
        </CCardBody>
      </CCard>

      <CModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader className="border-0">
          <CModalTitle className="w-100 text-center text-danger fw-bold">
            ⚠ Confirm Delete
          </CModalTitle>
        </CModalHeader>

        <CModalBody className="text-center">
          <p>Are you sure you want to delete this User?</p>

          <div
            style={{
              background: '#f8f9fa',
              padding: '12px',
              borderRadius: '8px',
              marginTop: '10px',
            }}
          >
            <div>
              <strong>User ID :</strong>{' '}
              <span className="text-primary fw-bold">{deleteUser?.userId}</span>
            </div>
          </div>
        </CModalBody>

        <CModalFooter className="border-0 d-flex justify-content-center">
          <CButton color="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </CButton>

          <CButton color="danger" onClick={confirmDelete}>
            Delete
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal
        visible={showPrivilegeModal}
        onClose={() => setShowPrivilegeModal(false)}
        size="lg"
      >
        <CModalHeader className="privilege-header">
          <CModalTitle className="privilege-title">
            <FaUsers className="me-2" />
            User Privilege
            <span className="privilege-user">- {selectedUser?.userName}</span>
          </CModalTitle>
        </CModalHeader>

        <CModalBody>
          <table className="table table-bordered text-center privilege-table">
            <thead>
              <tr>
                <th>Menus</th>
                <th>
                  All <br />
                  <input
                    type="checkbox"
                    checked={privileges.every(
                      (x) => x.canView && x.canEdit && x.canDelete,
                    )}
                    onChange={(e) => handleHeaderChange('all', e.target.checked)}
                  />
                </th>

                <th>
                  View <br />
                  <input
                    type="checkbox"
                    checked={privileges.every((x) => x.canView)}
                    onChange={(e) =>
                      handleHeaderChange('canView', e.target.checked)
                    }
                  />
                </th>

                <th>
                  Edit <br />
                  <input
                    type="checkbox"
                    checked={privileges.every((x) => x.canEdit)}
                    onChange={(e) =>
                      handleHeaderChange('canEdit', e.target.checked)
                    }
                  />
                </th>

                <th>
                  Delete <br />
                  <input
                    type="checkbox"
                    checked={privileges.every((x) => x.canDelete)}
                    onChange={(e) =>
                      handleHeaderChange('canDelete', e.target.checked)
                    }
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              {MENU_CONFIG.map((menu) => {
                if (menu.items) {
                  return (
                    <React.Fragment key={menu.name}>
                      <tr>
                        <td
                          colSpan="5"
                          style={{
                            fontWeight: '600',
                            background: '#dfe6f1',
                            textAlign: 'left',
                          }}
                        >
                          {menu.name}
                        </td>
                      </tr>

                      {menu.items.map((child) => {
                        const childIndex = privileges.findIndex(
                          (x) => x.menuName === child.name,
                        )

                        const cp = privileges[childIndex] || {}

                        return (
                          <tr key={child.name}>
                            <td
                              className="menu-cell"
                              style={{ paddingLeft: '35px' }}
                            >
                              <div className="d-flex align-items-center gap-2">
                                <CIcon icon={child.icon} size="sm" />
                                {child.name}
                              </div>
                            </td>

                            <td>
                              <input
                                type="checkbox"
                                checked={cp.canView && cp.canEdit && cp.canDelete}
                                onChange={() =>
                                  handlePrivilegeChange(childIndex, 'all')
                                }
                              />
                            </td>

                            <td>
                              <input
                                type="checkbox"
                                checked={cp.canView || false}
                                onChange={() =>
                                  handlePrivilegeChange(childIndex, 'canView')
                                }
                              />
                            </td>

                            <td>
                              <input
                                type="checkbox"
                                checked={cp.canEdit || false}
                                onChange={() =>
                                  handlePrivilegeChange(childIndex, 'canEdit')
                                }
                              />
                            </td>

                            <td>
                              <input
                                type="checkbox"
                                checked={cp.canDelete || false}
                                onChange={() =>
                                  handlePrivilegeChange(childIndex, 'canDelete')
                                }
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                }

                const index = privileges.findIndex((x) => x.menuName === menu.name)
                const p = privileges[index] || {}

                return (
                  <tr key={menu.name}>
                    <td className="menu-cell">
                      <div className="d-flex align-items-center gap-2">
                        <CIcon icon={menu.icon} size="sm" />
                        {menu.name}
                      </div>
                    </td>

                    <td>
                      <input
                        type="checkbox"
                        checked={p.canView && p.canEdit && p.canDelete}
                        onChange={() => handlePrivilegeChange(index, 'all')}
                      />
                    </td>

                    <td>
                      <input
                        type="checkbox"
                        checked={p.canView || false}
                        onChange={() => handlePrivilegeChange(index, 'canView')}
                      />
                    </td>

                    <td>
                      <input
                        type="checkbox"
                        checked={p.canEdit || false}
                        onChange={() => handlePrivilegeChange(index, 'canEdit')}
                      />
                    </td>

                    <td>
                      <input
                        type="checkbox"
                        checked={p.canDelete || false}
                        onChange={() => handlePrivilegeChange(index, 'canDelete')}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CModalBody>

        <CModalFooter className="justify-content-center gap-3">
          <CButton className="privilege-save-btn" onClick={savePrivileges}>
            Save Privilege
          </CButton>

          <CButton
            className="privilege-clear-btn"
            onClick={() => setShowPrivilegeModal(false)}
          >
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default UserMaster