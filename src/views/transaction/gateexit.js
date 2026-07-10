import React, { useEffect, useRef, useState } from 'react'
import { CCard, CCardBody } from '@coreui/react'
import { toast } from 'react-toastify'
import ScanIcon from '../../assets/images/boxicons_scan-filled.png'
import API from '../../api.js'
import '../../assets/CSS/user.css'

const GateExit = () => {
  const scanRef = useRef(null)
  const timerRef = useRef(null)

  const [isScanning, setIsScanning] = useState(false)
  const [scannedData, setScannedData] = useState(null)
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    focusScanner()
  }, [])

  const focusScanner = () => {
    setTimeout(() => {
      scanRef.current?.focus()
    }, 100)
  }

  const handleScanClick = () => {
    focusScanner()
  }

  const extractInvoiceNo = (rawValue) => {
    const invoiceMatch = rawValue.match(/107\d{7}/)
    return invoiceMatch ? invoiceMatch[0] : rawValue.trim()
  }

  const handleScanSubmit = async (barcodeValue) => {
    if (!barcodeValue || isScanning) return

    setIsScanning(true)

    try {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}')
      const userId =
        user?.userId || user?.id || user?.UserId || user?.User_ID || 1

      const invoiceNo = extractInvoiceNo(barcodeValue)

      if (!invoiceNo) {
        toast.error('Invalid barcode')
        return
      }

      const res = await API.post('/GateExit/scan', {
        invoiceNo,
        userId: Number(userId),
      })

      setScannedData({
        invoiceNo: res.data.invoiceNo,
        despatchId: res.data.despatchId,
        customerName: res.data.customerName,
        totalQty: res.data.totalQty,
        exitTime: res.data.exitTime,
      })

      setShowPopup(true)
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data ||
          'Gate Exit Failed',
      )
    } finally {
      setIsScanning(false)
      focusScanner()
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

  const closePopup = () => {
    setShowPopup(false)
    setScannedData(null)
    focusScanner()
  }

  return (
    <div className="user-master-page scan-invoice-page">
      <CCard className="user-form-card scan-card">
        <CCardBody>

          <div className="section-title">GATE EXIT</div>

          <p className="gate-subtitle">
            Scan and verify Invoice
          </p>

          <input
            ref={scanRef}
            type="text"
            onChange={handleScanChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(focusScanner, 10)}
            autoComplete="off"
            disabled={isScanning}
            style={{
              position: 'absolute',
              opacity: 0,
              width: 0,
              height: 0,
              border: 'none',
              outline: 'none',
            }}
          />

          <div
            className="gate-scan-box"
            onClick={handleScanClick}
          >
            <img
              src={ScanIcon}
              alt="Scan"
              className="gate-scan-image"
            />

            <span className="scanner-cursor"></span>

            <div className="gate-scan-text">
              Scan and verify Invoice
            </div>
          </div>

          <div className="gate-info-box">
            Scan the Invoice for the Gate Exit
          </div>

        </CCardBody>
      </CCard>

      {/* Popup */}
      {showPopup && scannedData && (
        <div className="popup-overlay">
          <div className="popup-box">

            <h3 className="popup-title">
              Gate Exit Successful
            </h3>

            <div className="popup-details">

              <div>
                Invoice No :
                <strong>{scannedData.invoiceNo}</strong>
              </div>

              <div>
                Despatch ID :
                <strong>{scannedData.despatchId}</strong>
              </div>

              <div>
                Customer Name :
                <strong>{scannedData.customerName}</strong>
              </div>

              <div>
                Total Quantity :
                <strong>{scannedData.totalQty}</strong>
              </div>

              <div>
                Exit Time :
                <strong>{scannedData.exitTime}</strong>
              </div>

            </div>

            <button
              className="popup-ok-btn"
              onClick={closePopup}
            >
              OK
            </button>

          </div>
        </div>
      )}
    </div>
  )
}

export default GateExit