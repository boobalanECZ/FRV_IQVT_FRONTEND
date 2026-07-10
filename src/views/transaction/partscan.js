// PartScan.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react'
import DataTable from 'react-data-table-component'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CRow,
  CModal,
  CModalBody,
} from '@coreui/react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'react-toastify'
import API from '../../api.js'
import ScanIcon from '../../assets/images/boxicons_scan-filled.png'
import '../../assets/CSS/user.css'

const PartScan = () => {
  const scanRef = useRef(null)
  const timerRef = useRef(null)
  const scanLockRef = useRef(false)

  const [header, setHeader] = useState(null)
  const [parts, setParts] = useState([])
  const [scannedRows, setScannedRows] = useState([])
  const [isScanning, setIsScanning] = useState(false)
  const [showVerifiedModal, setShowVerifiedModal] = useState(false)
  const [verifiedInvoice, setVerifiedInvoice] = useState('')

  const getUserId = () => {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}')
    return user?.userId || user?.id || user?.UserId || user?.User_ID || 1
  }

  const focusScanner = () => {
    if (scanRef.current && !scanRef.current.disabled) {
      scanRef.current.focus()
    }
  }

  useEffect(() => {
    const timer = setInterval(focusScanner, 300)
    return () => clearInterval(timer)
  }, [])

  const loadCurrentInvoice = useCallback(async () => {
    try {
      const userId = getUserId()
      const res = await API.get(`/partscan/pending/${userId}`)

      setHeader(res.data)
      setParts(res.data.parts || res.data.Parts || [])
    } catch {
      setHeader(null)
      setParts([])
      setScannedRows([])
    } finally {
      setTimeout(focusScanner, 100)
    }
  }, [])

  useEffect(() => {
    loadCurrentInvoice()
  }, [loadCurrentInvoice])

  const getStatus = (item) => {
    const invQty = Number(item.invoiceQty || item.InvoiceQty || 0)
    const boxCount = Number(item.boxCount || item.BoxCount || 0)
    const partCount = Number(item.partCount || item.PartCount || 0)

    const isBox = item.isBoxTag || item.IsBoxTag
    const isPart = item.isPart || item.IsPart

    const boxDone = !isBox || boxCount >= invQty
    const partDone = !isPart || partCount >= invQty

    if (boxDone && partDone) return 'Verified'
    if (boxCount > 0 || partCount > 0) return 'In Progress'
    return 'Pending'
  }

  const showBoxColumn = parts.some((item) => item.isBoxTag || item.IsBoxTag)
  const showPartColumn = parts.some((item) => item.isPart || item.IsPart)

  const totalQty = parts.reduce(
    (sum, item) => sum + Number(item.invoiceQty || item.InvoiceQty || 0),
    0,
  )

  const totalBoxScanned = parts.reduce((sum, item) => {
    const isBox = item.isBoxTag || item.IsBoxTag
    if (!isBox) return sum
    return sum + Number(item.boxCount || item.BoxCount || 0)
  }, 0)

  const totalPartScanned = parts.reduce((sum, item) => {
    const isPart = item.isPart || item.IsPart
    if (!isPart) return sum
    return sum + Number(item.partCount || item.PartCount || 0)
  }, 0)

  const progressText =
    showBoxColumn && showPartColumn
      ? `Qty ${totalQty} / Box ${totalBoxScanned} / Part ${totalPartScanned}`
      : showBoxColumn
        ? `Qty ${totalQty} / Box ${totalBoxScanned}`
        : showPartColumn
          ? `Qty ${totalQty} / Part ${totalPartScanned}`
          : `Qty ${totalQty}`

  const isAllScanned =
    parts.length > 0 && parts.every((item) => getStatus(item) === 'Verified')

  const handleScanSubmit = async (barcodeValue) => {
    if (!header) {
      toast.error('No invoice loaded. Please scan invoice details first.')
      focusScanner()
      return
    }

    if (!barcodeValue || scanLockRef.current) return

    scanLockRef.current = true
    setIsScanning(true)

    try {
      const userId = getUserId()

      const res = await API.post('/partscan/scan', {
        userId,
        barcode: barcodeValue.trim(),
      })

      const data = res.data

      setParts((prev) =>
        prev.map((item) => {
          const partNo = item.partNo || item.PartNo

          if (partNo === data.partNo) {
            return {
              ...item,
              labelCount:
                data.labelQty !== undefined
                  ? data.labelQty
                  : data.scannedQty || 0,
              LabelCount:
                data.labelQty !== undefined
                  ? data.labelQty
                  : data.scannedQty || 0,
              boxCount:
                data.boxQty !== undefined
                  ? data.boxQty
                  : item.boxCount || 0,
              BoxCount:
                data.boxQty !== undefined
                  ? data.boxQty
                  : item.BoxCount || 0,
              partCount:
                data.partQty !== undefined
                  ? data.partQty
                  : item.partCount || 0,
              PartCount:
                data.partQty !== undefined
                  ? data.partQty
                  : item.PartCount || 0,
            }
          }

          return item
        }),
      )

      setHeader((prev) => ({
        ...prev,
        id: data.headerId,
        Id: data.headerId,
        status: data.headerStatus,
        Status: data.headerStatus,
      }))
      setScannedRows((prev) => [
        ...prev,
        {
          no: prev.length + 1,
          scannedData: data.serialNo || barcodeValue,
          partNo: data.partNo,
          type: data.scanType || data.type || 'PART SCAN',
        },
      ])

      toast.success(data.message || 'Scanned Successfully')
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
        err?.response?.data ||
        'Scan Failed',
      )
    } finally {
      scanLockRef.current = false
      setIsScanning(false)

      if (scanRef.current) {
        scanRef.current.value = ''
      }

      setTimeout(focusScanner, 20)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      const value = e.target.value.trim()

      if (value) {
        e.target.value = ''
        handleScanSubmit(value)
      }
    }
  }

  const handleScanChange = (e) => {
    const input = e.target

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      const value = input.value.trim()

      if (!value) return

      input.value = ''
      handleScanSubmit(value)
    }, 300)
  }

  const handleConfirm = async () => {
    const headerId = header?.id || header?.Id
    const invoiceNumber = header?.invoiceNumber || header?.InvoiceNumber || ''

    if (!headerId) {
      toast.error('Header not found')
      focusScanner()
      return
    }

    try {
      const userId = getUserId()

      await API.post(`/partscan/confirm/${headerId}?userId=${userId}`)

      setVerifiedInvoice(invoiceNumber)
      setShowVerifiedModal(true)

      toast.success('Confirmed Successfully')

      setScannedRows([])
      await loadCurrentInvoice()
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
        err?.response?.data ||
        'Confirm Failed',
      )
      focusScanner()
    }
  }

  const handlePrintVerified = () => {
    const printContent =
      document.getElementById('verified-print-label')?.innerHTML

    if (!printContent) return

    const printWindow = window.open('', '', 'width=500,height=650')

    printWindow.document.write(`
      <html>
        <head>
          <title>Verified Invoice</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 30px;
            }

            .verified-box {
              border: 2px solid #16a34a;
              border-radius: 12px;
              padding: 25px;
              display: inline-block;
              min-width: 280px;
            }

            .verified-symbol {
              font-size: 60px;
              color: #16a34a;
              font-weight: bold;
            }

            .verified-text {
              color: #16a34a;
              font-size: 24px;
              font-weight: bold;
              margin-top: 10px;
            }

            .verified-invoice-no {
              font-size: 20px;
              font-weight: bold;
              margin-top: 15px;
            }

            svg {
              margin-top: 18px;
            }

            @media print {
              body {
                margin: 0;
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()

    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  const partColumns = [
    {
      name: 'S.No',
      cell: (row, index) => index + 1,
      width: '70px',
      center: true,
    },
    {
      name: 'Part No',
      selector: (row) => row.partNo || row.PartNo,
      grow: 1,
      wrap: true,
      center: true,
    },
    {
      name: 'Invoice Qty',
      selector: (row) => row.invoiceQty || row.InvoiceQty,
      width: '120px',
      center: true,
    },
    ...(showBoxColumn
      ? [
        {
          name: 'Box Scanned',
          cell: (row) => {
            const isBox = row.isBoxTag || row.IsBoxTag
            if (!isBox) return <span className="text-muted">-</span>

            return (
              <span style={{ color: '#2563eb', fontWeight: '700' }}>
                {row.boxCount || row.BoxCount || 0}
              </span>
            )
          },
          width: '150px',
          center: true,
        },
      ]
      : []),
    ...(showPartColumn
      ? [
        {
          name: 'Part Scanned',
          cell: (row) => {
            const isPart = row.isPart || row.IsPart
            if (!isPart) return <span className="text-muted">-</span>

            return (
              <span style={{ color: '#f59e0b', fontWeight: '700' }}>
                {row.partCount || row.PartCount || 0}
              </span>
            )
          },
          width: '150px',
          center: true,
        },
      ]
      : []),
    {
      name: 'Status',
      cell: (row) => {
        const status = getStatus(row)

        return (
          <span
            style={{
              background:
                status === 'Verified'
                  ? '#dcfce7'
                  : status === 'In Progress'
                    ? '#fef3c7'
                    : '#f3f4f6',
              color:
                status === 'Verified'
                  ? '#15803d'
                  : status === 'In Progress'
                    ? '#b45309'
                    : '#6b7280',
              padding: '4px 12px',
              borderRadius: '20px',
              fontWeight: '700',
            }}
          >
            {status}
          </span>
        )
      },
      width: '150px',
      center: true,
    },
  ]

  const scanColumns = [
    {
      name: 'S.No',
      selector: (row) => row.no,
      width: '65px',
      center: true,
    },
    {
      name: 'Scanned Data',
      selector: (row) => row.scannedData,
      grow: 1,
      wrap: true,
      center: true,
    },
    {
      name: 'Type',
      selector: (row) => row.type,
      width: '115px',
      wrap: true,
      center: true,
    },
  ]

  return (
    <div className="part-scan-page">
      <CRow className="part-scan-layout g-3">
        <CCol xs={12} lg={3} className="part-left-col">
          <CCard className="part-summary-card">
            <CCardBody className="text-center">
              <div className="invoice-no">
                {header?.invoiceNumber ||
                  header?.InvoiceNumber ||
                  'No Invoice Scanned'}
              </div>

              <div className="customer-name">
                {header?.customerName ||
                  header?.CustomerName ||
                  'Please scan an invoice to continue'}
              </div>

              <div className="customer-no">
                Customer No.{' '}
                <span>{header?.customerId || header?.CustomerId || 'N/A'}</span>
              </div>

              <div className="customer-no mt-2">
                Status:{' '}
                <span>{header?.status || header?.Status || 'Awaiting Invoice Scan'}</span>
              </div>
            </CCardBody>
          </CCard>

          <CCard className="mt-3 progress-card">
            <CCardBody>
              <div className="progress-header">
                <strong>Scan Progress</strong>
                <span className="progress-pill">{progressText}</span>
              </div>

              <div className="scan-progress-grid">
                <DataTable
                  columns={scanColumns}
                  data={scannedRows}
                  noHeader
                  dense
                  persistTableHead
                  fixedHeader
                  fixedHeaderScrollHeight="500px"
                  noDataComponent=""
                />
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} lg={9} className="part-right-col">
          <CCard className="scan-part-card">
            <CCardBody>
              <div className="section-title">SCAN PART</div>

              <label className="custom-label">
                Scan Part Label / Barcode <span className="required">*</span>
              </label>

              <div className="part-scan-box" onClick={focusScanner}>
                <img src={ScanIcon} alt="scan" className="part-scan-img" />

                <input
                  ref={scanRef}
                  type="text"
                  onChange={handleScanChange}
                  onKeyDown={handleKeyDown}
                  onBlur={() => setTimeout(focusScanner, 10)}
                  className="scanner-input"
                  autoComplete="off"
                  autoFocus
                  disabled={isScanning}
                />

                <span className="part-scanner-cursor"></span>

                <div>{isScanning ? 'Processing...' : 'Scan Part Barcode'}</div>
              </div>
            </CCardBody>
          </CCard>

          <CCard className="mt-3 scanned-card">
            <CCardBody>
              <div className="table-header mb-4">
                <div className="table-title">
                  <span>SCANNED PARTS (CURRENT INVOICE)</span>
                </div>

                <span className="progress-pill">{progressText}</span>
              </div>

              <div className="parts-table-wrapper">
                <DataTable
                  columns={partColumns}
                  data={parts}
                  noHeader={false}
                  responsive
                  pagination
                  persistTableHead
                  highlightOnHover={false}
                  noDataComponent="No Invoice Scanned"
                />
              </div>

              {isAllScanned && (
                <div className="confirm-area">
                  <CButton className="confirm-btn" onClick={handleConfirm}>
                    Confirm
                  </CButton>
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CModal
        visible={showVerifiedModal}
        onClose={() => setShowVerifiedModal(false)}
        alignment="center"
        backdrop="static"
      >
        <CModalBody className="text-center p-4">
          <div id="verified-print-label">
            <div className="verified-box">
              <div className="verified-symbol">✓</div>

              <div className="verified-text">VERIFIED</div>

              <div className="verified-invoice-no">
                Invoice No: {verifiedInvoice}
              </div>

              <div style={{ marginTop: '18px' }}>
                <QRCodeSVG
                  value={`VERIFIED-INVOICE:${verifiedInvoice}`}
                  size={150}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-center gap-2 mt-4">
            <CButton color="success" onClick={handlePrintVerified}>
              Print Verified QR
            </CButton>

            <CButton
              color="secondary"
              onClick={() => setShowVerifiedModal(false)}
            >
              Close
            </CButton>
          </div>
        </CModalBody>
      </CModal>
    </div>
  )
}

export default PartScan