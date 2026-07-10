import React, { useEffect, useRef, useState } from 'react'
import DataTable from 'react-data-table-component'
import {
  CButton,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CFormSelect,
  CFormInput,
} from '@coreui/react'
import { FaSave } from 'react-icons/fa'
import { toast } from 'react-toastify'
import ScanIcon from '../../assets/images/boxicons_scan-filled.png'
import API from '../../api.js'
import '../../assets/CSS/user.css'

const ScanInvoice = () => {
  const scanRef = useRef(null)
  const customerRef = useRef(null)
  const timerRef = useRef(null)

  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [dispatchId, setDispatchId] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

  const [form, setForm] = useState({
    customer_ID: '',
  })

  const [errors, setErrors] = useState({
    customer_ID: '',
    barcode: '',
    invoiceNo: '',
  })

  useEffect(() => {
    loadCustomers()

    setTimeout(() => {
      customerRef.current?.focus()
    }, 200)
  }, [])

  const getUserId = () => {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}')
    return user?.userId || user?.id || user?.UserId || user?.User_ID || 1
  }

  const clearError = (name) => {
    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }))
  }

  const focusScanner = () => {
    setTimeout(() => {
      scanRef.current?.focus()
    }, 100)
  }

  const loadCustomers = async () => {
    try {
      const res = await API.get('/customer')
      setCustomers(res.data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load customers')
    }
  }

  const getInvoiceQuantity = (record) => {
    const values = record.match(/\d+\.\d{2}/g) || []
    const basicPrice = Number(values[6])
    const amount = Number(values[7])

    if (!basicPrice || !amount) return 1
    return Math.round(amount / basicPrice)
  }

  const splitBarcodeRecords = (qr) => {
    const starts = []
    const regex = /(?:AC\d{10}|AE\d{11}|aE\d{11}|aC\d{10})/g
    let match

    while ((match = regex.exec(qr)) !== null) {
      starts.push(match.index)
    }

    if (!starts.length) return [qr]

    return starts.map((start, index) => {
      const end = starts[index + 1] || qr.length
      return qr.substring(start, end)
    })
  }

  const extractRowFromRecord = (record) => {
    const invoiceMatch = record.match(/107\d{7}/)
    const chennaiPart = record.match(/28700T\d{4}/)
    const punePart = record.match(/285\d{7}[A-Z]?/)

    return {
      invoice_Number: invoiceMatch?.[0] || '',
      part_Number: chennaiPart?.[0] || punePart?.[0] || '',
      quantity: getInvoiceQuantity(record) || 1,
    }
  }

  const processQRCode = async (rawValue) => {
    if (!form.customer_ID) {
      setErrors((prev) => ({
        ...prev,
        customer_ID: 'Please select customer',
      }))

      customerRef.current?.focus()
      return
    }

    try {
      clearError('barcode')

      const qr = rawValue
        .replace(/\r/g, '')
        .replace(/\n/g, '')
        .replace(/\t/g, '')
        .trim()

      const records = splitBarcodeRecords(qr)

      const rows = records
        .map((record) => extractRowFromRecord(record))
        .filter((item) => item.invoice_Number && item.part_Number)

      if (!rows.length) {
        setErrors((prev) => ({
          ...prev,
          barcode: 'No valid invoice data found',
        }))

        scanRef.current.value = ''
        focusScanner()
        return
      }

      const scannedInvoiceNo = rows[0].invoice_Number

      if (
        invoices.length > 0 &&
        invoices[0].invoice_Number !== scannedInvoiceNo
      ) {
        setErrors((prev) => ({
          ...prev,
          barcode: `Invoice ${invoices[0].invoice_Number} already scanned. Please Save/Cancel before scanning another invoice.`,
        }))

        scanRef.current.value = ''
        focusScanner()
        return
      }
      const userId = getUserId()

      const checkRes = await API.get('/invoices/checkinvoice', {
        params: {
          invoiceNo: scannedInvoiceNo,
          userId: Number(userId),
        },
      })

      if (checkRes.data.exists || checkRes.data.Exists) {
        setErrors((prev) => ({
          ...prev,
          barcode:
            checkRes.data.message ||
            checkRes.data.Message ||
            'Invoice already scanned',
        }))

        scanRef.current.value = ''
        scanRef.current.focus()
        return
      }

      if (checkRes.data === true) {
        setErrors((prev) => ({
          ...prev,
          barcode: `Invoice No ${scannedInvoiceNo} already scanned`,
        }))

        scanRef.current.value = ''
        scanRef.current.focus()
        return
      }

      setDispatchId('')

      setErrors((errorPrev) => ({
        ...errorPrev,
        barcode: '',
      }))

      toast.success(`${rows.length} Record(s) Added Successfully`)

      setInvoices((prev) => [...prev, ...rows])

      scanRef.current.value = ''
      focusScanner()
    } catch (err) {
      console.error(err)

      setErrors((prev) => ({
        ...prev,
        barcode: 'Invalid QR format',
      }))

      scanRef.current.value = ''
      focusScanner()
    }
  }

  const handleScanChange = (e) => {
    const input = e.target

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(async () => {
      const value = input.value.trim()
      if (!value) return

      await processQRCode(value)
      input.value = ''
    }, 50)
  }

  const handleSubmit = async () => {
    let hasError = false

    if (!form.customer_ID) {
      setErrors((prev) => ({
        ...prev,
        customer_ID: 'Customer name is required',
      }))

      customerRef.current?.focus()
      hasError = true
    }

    if (invoices.length === 0) {
      setErrors((prev) => ({
        ...prev,
        barcode: 'Please scan invoice',
      }))

      focusScanner()
      hasError = true
    }

    if (hasError) return

    try {
      const userId = getUserId()

      const payload = {
        customerId: Number(form.customer_ID),
        createdBy: Number(userId),
        invoices: invoices.map((item) => ({
          invoiceNo: item.invoice_Number,
          partNo: item.part_Number,
          qty: Number(item.quantity || 1),
        })),
      }

      const res = await API.post('/invoices/bulk', payload)

      const newDispatchId =
        res.data?.DespatchID ||
        res.data?.despatchID ||
        res.data?.dispatchId ||
        ''

      setDispatchId(newDispatchId)
      setInvoices([])
      setForm({ customer_ID: '' })
      setInvoiceNo('')
      setErrors({
        customer_ID: '',
        barcode: '',
        invoiceNo: '',
      })

      if (scanRef.current) {
        scanRef.current.value = ''
      }

      setTimeout(() => {
        customerRef.current?.focus()
      }, 100)

      toast.success(`Invoice Saved Successfully - Dispatch ID: ${newDispatchId}`)
    } catch (err) {
      console.error(err)

      setErrors((prev) => ({
        ...prev,
        barcode:
          err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.response?.data ||
          'Save Failed',
      }))
    }
  }

  const searchInvoice = async () => {
    if (!invoiceNo.trim()) {
      setErrors((prev) => ({
        ...prev,
        invoiceNo: 'Please enter invoice number',
      }))
      return
    }

    try {
      clearError('invoiceNo')

      const res = await API.get(`/Invoices/invoice/${invoiceNo.trim()}`)

      const foundDispatchId =
        res.data?.despatchID ||
        res.data?.DespatchID ||
        res.data?.dispatchId ||
        ''

      setDispatchId(foundDispatchId)
      setInvoices(res.data?.invoices || [])

      toast.success(`Dispatch Found : ${foundDispatchId}`)
    } catch (err) {
      console.error(err)

      setDispatchId('')
      setInvoices([])

      setErrors((prev) => ({
        ...prev,
        invoiceNo:
          err?.response?.data?.message ||
          err?.response?.data?.Message ||
          'Invoice not found',
      }))
    }
  }

  const handleCancel = async () => {
    if (isCancelling) return

    try {
      setIsCancelling(true)

      if (dispatchId) {
        const userId = getUserId()

        const res = await API.put(`/Invoices/cancel-dispatch/${dispatchId}`, {
          userId: Number(userId),
        })

        toast.success(
          res.data?.message ||
          res.data?.Message ||
          `Dispatch ${dispatchId} Cancelled Successfully`,
        )
      } else {
        toast.info('Grid Cleared')
      }

      setForm({ customer_ID: '' })
      setInvoices([])
      setDispatchId('')
      setInvoiceNo('')
      setErrors({
        customer_ID: '',
        barcode: '',
        invoiceNo: '',
      })

      if (scanRef.current) {
        scanRef.current.value = ''
      }

      setTimeout(() => {
        customerRef.current?.focus()
      }, 100)
    } catch (err) {
      console.error(err)

      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        err?.response?.data ||
        'Failed to cancel dispatch'

      setErrors((prev) => ({
        ...prev,
        invoiceNo: msg,
      }))

      toast.error(msg)
    } finally {
      setIsCancelling(false)
    }
  }

  const columns = [
    {
      name: 'S.NO',
      cell: (row, index) => index + 1,
      width: '120px',
    },
    {
      name: 'INVOICE NUMBER',
      selector: (row) => row.invoice_Number,
      cell: (row) => <span className="invoice-blue">{row.invoice_Number}</span>,
    },
    {
      name: 'PART NUMBER',
      selector: (row) => row.part_Number || '-',
    },
    {
      name: 'QUANTITY',
      selector: (row) => Number(row.quantity || 1),
    },
  ]

  const customStyles = {
    rows: {
      style: {
        minHeight: '62px',
      },
    },
    headCells: {
      style: {
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: '700',
        backgroundColor: '#eef4ff',
        color: '#3d4656',
      },
    },
    cells: {
      style: {
        justifyContent: 'center',
        fontSize: '20px',
      },
    },
  }

  return (
    <div className="user-master-page scan-invoice-page">
      <CCard className="user-form-card scan-card">
        <CCardBody>
          <div className="section-title">SCAN INVOICE DETAILS</div>
          <CRow>
            <CCol md={12}>
              <label className="custom-label">
                Customer Name <span className="required">*</span>
              </label>
              <CFormSelect
                ref={customerRef}
                name="customer_ID"
                value={form.customer_ID}
                className={errors.customer_ID ? 'error-input' : ''}
                onChange={(e) => {
                  setForm({
                    ...form,
                    customer_ID: e.target.value,
                  })
                  clearError('customer_ID')
                  setTimeout(() => {
                    scanRef.current?.focus()
                  }, 100)
                }}
              >
                <option value="">Select Customer</option>
                {customers.map((item) => (
                  <option key={item.customerId} value={item.customerId}>
                    {item.customerName}
                  </option>
                ))}
              </CFormSelect>
              {errors.customer_ID && (
                <div className="field-error">{errors.customer_ID}</div>
              )}
            </CCol>
            <CCol md={12} className="mt-4">
              <label className="custom-label">
                Scan Invoice Barcode / QR Code
              </label>
              <div
                className={`scan-box ${errors.barcode ? 'error-scan-box' : ''}`}
                onClick={focusScanner}
              >
                <img src={ScanIcon} alt="Scan" className="scan-image" />
                <input
                  ref={scanRef}
                  type="text"
                  className="scanner-input"
                  autoComplete="off"
                  onChange={handleScanChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                    }
                  }}
                />

                <span className="scanner-cursor"></span>
                <div className="scan-text">Scan Invoice Barcode</div>
              </div>
              {errors.barcode && (
                <div className="field-error">{errors.barcode}</div>
              )}
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mt-4 table-card scan-card">
        <CCardBody>
          <div className="table-title mb-4">
            <span>INVOICE LIST</span>
          </div>

          <div className="search-panel mb-3">
            <div className="search-input-wrapper">
              <CFormInput
                className={`search-input ${errors.invoiceNo ? 'error-input' : ''
                  }`}
                placeholder="Enter Invoice Number to Cancel"
                value={invoiceNo}
                onChange={(e) => {
                  setInvoiceNo(e.target.value)
                  clearError('invoiceNo')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    searchInvoice()
                  }
                }}
              />

              {errors.invoiceNo && (
                <div className="field-error">{errors.invoiceNo}</div>
              )}
            </div>

            <CButton className="search-btn" color="primary" onClick={searchInvoice}>
              Search
            </CButton>
          </div>

          <DataTable
            columns={columns}
            data={invoices}
            responsive
            customStyles={customStyles}
            noHeader={false}
            pagination
            persistTableHead
            noDataComponent="No Invoice Scanned"
          />

          <div className="scan-button-area">
            <CButton
              type="button"
              className="scan-save-btn"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleSubmit()
              }}
            >
              <FaSave className="me-2" />
              Save
            </CButton>

            <CButton
              type="button"
              className="scan-cancel-btn"
              disabled={isCancelling}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleCancel()
              }}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel'}
            </CButton>
          </div>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default ScanInvoice