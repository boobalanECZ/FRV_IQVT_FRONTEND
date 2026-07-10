import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaBuilding, FaQrcode, FaCheckCircle, FaClock, FaChevronRight } from 'react-icons/fa';
import { toast } from 'react-toastify';
import API from '../../api';
import {
    CButton,
    CCard,
    CCardBody,
    CCol,
    CRow,
    CModal,
    CModalBody,
} from '@coreui/react'
import '../../assets/CSS/partscan.css';
import { QRCodeSVG } from 'qrcode.react'

const PartScan = () => {
    const [partBarcode, setPartBarcode] = useState('');
    const [parts, setParts] = useState([]);
    const [header, setHeader] = useState(null);
    const [confirming, setConfirming] = useState(false);
    const [scanning, setScanning] = useState(false);
    const navigate = useNavigate();
    const scanRef = useRef(null);
    const debounceTimer = useRef(null);
    const isScanning = useRef(false);
    const [showVerifiedModal, setShowVerifiedModal] = useState(false);
    const [verifiedInvoice, setVerifiedInvoice] = useState('');

    const focusScan = () => setTimeout(() => scanRef.current?.focus(), 150);

    const loadData = useCallback(async () => {
        try {
            const user = JSON.parse(sessionStorage.getItem('user') || '{}');
            const res = await API.get(`/partscan/pending/${user.id}`);
            setHeader(res.data);
            setParts(res.data.parts || []);
        } catch (err) {
            console.error('loadData error:', err);
        }
    }, []);

    useEffect(() => {
        loadData().then(focusScan);
    }, [loadData]);

    /*
     * Verified = ALL required scan types are complete:
     *   - labelCount >= invoiceQty  (always required — increments every scan)
     *   - boxCount  >= invoiceQty   (only if isBoxTag)
     *   - partCount >= invoiceQty   (only if isPart)
     */
    const getStatus = (item) => {
        const qty = item.invoiceQty || 1;
        const labelDone = (item.labelCount || 0) >= qty;
        const boxDone = !item.isBoxTag || (item.boxCount || 0) >= qty;
        const partDone = !item.isPart || (item.partCount || 0) >= qty;

        if (labelDone && boxDone && partDone) return 'Verified';
        if ((item.labelCount || 0) > 0 ||
            (item.boxCount || 0) > 0 ||
            (item.partCount || 0) > 0) return 'In Progress';
        return 'Pending';
    };

    /*
     * Progress bar: use the LOWEST completion among required types.
     * This way the bar only fills when ALL required types are scanned.
     */
    const getProgress = (item) => {
        const qty = item.invoiceQty || 1;
        const ratios = [(item.labelCount || 0) / qty];
        if (item.isBoxTag) ratios.push((item.boxCount || 0) / qty);
        if (item.isPart) ratios.push((item.partCount || 0) / qty);
        return Math.min(100, Math.min(...ratios) * 100);
    };

    /*
     * Build count rows to display on the right side of each card.
     * Always show: Label (every scan increments this)
     * + Box row if isBoxTag
     * + Part row if isPart
     * Format: label / invoiceQty
     *         box   / invoiceQty  (if required)
     *         part  / invoiceQty  (if required)
     */
    const getCountRows = (item) => {
        const qty = item.invoiceQty;
        const rows = [
            // { label: 'Label', scanned: item.labelCount || 0, total: qty }
        ];
        if (item.isBoxTag) rows.push({ label: 'Box', scanned: item.boxCount || 0, total: qty });
        if (item.isPart) rows.push({ label: 'Part', scanned: item.partCount || 0, total: qty });
        return rows;
    };

    const canConfirm =
        parts.length > 0 && parts.every(p => getStatus(p) === 'Verified');

    const executeScan = useCallback(async (barcode) => {
        if (!barcode || isScanning.current) return;
        isScanning.current = true;
        setScanning(true);
        try {
            const user = JSON.parse(sessionStorage.getItem('user') || '{}');
            const res = await API.post('/partscan/scan', {
                userId: user.id,
                barcode: barcode.trim()
            });

            toast.success(res.data.message || 'Scanned!');

            setParts(prev =>
                prev.map(p =>
                    p.partNo === res.data.partNo
                        ? {
                            ...p,
                            labelCount: res.data.labelQty ?? p.labelCount,
                            boxCount: res.data.boxQty ?? p.boxCount,
                            partCount: res.data.partQty ?? p.partCount
                        }
                        : p
                )
            );

            if (res.data.headerId) {
                setHeader(h => ({
                    ...h,
                    id: res.data.headerId,
                    status: res.data.headerStatus
                }));
            }
        } catch (err) {
            const msg = err?.response?.data;
            if (msg && !String(msg).includes('No pending invoice')) {
                toast.error(typeof msg === 'string' ? msg : 'Scan failed');
            }
        } finally {
            isScanning.current = false;
            setScanning(false);
            setPartBarcode('');
            focusScan();
        }
    }, []);

    const handleChange = (e) => {
        const value = e.target.value;
        setPartBarcode(value);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (!value.trim()) return;
        debounceTimer.current = setTimeout(() => executeScan(value), 300);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            executeScan(partBarcode);
        }
    };

    const handleConfirm = async () => {
        if (!canConfirm || !header?.id)
            return;
        try {
            setConfirming(true);
            const user = JSON.parse(
                sessionStorage.getItem('user') || '{}'
            );
            const res = await API.post(
                `/partscan/confirm/${header.id}?userId=${user.id}`
            );
            setHeader(prev => ({
                ...prev,
                status: 'VERIFIED'
            }));

            setVerifiedInvoice(
                header?.invoiceNumber
            );
            setShowVerifiedModal(true);
            toast.success(
                'Invoice Verified Successfully'
            );

                 setTimeout(() => {
                navigate("/mobiletransaction/gateexit");
            }, 5000);

        }
        catch (err) {

            toast.error(
                err?.response?.data ||
                'Confirm Failed'
            );
        }
        finally {
            setConfirming(false);
        }
    };

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

    return (
        <div className="partscan-container">
            <div className="partscan-header">
                <div>
                    <h2>Scan Part & Box Label</h2>
                    <p>Scan and verify part labels</p>
                </div>
                <div
                    className="mobility-back-icon"
                    onClick={() => navigate(-1)}
                    title="Back"
                >
                    <FaArrowLeft />
                </div>
            </div>

            {/* BODY — flex column, no outer scroll */}
            <div className="partscan-body">

             <div className="customer-card">
    <div className="customer-left">
        <div className="customer-icon">
            <FaBuilding />
        </div>

        <div>
            {header ? (
                <>
                    <small>Customer</small>
                    <h4>{header.customerName}</h4>
                    <span>Invoice No. {header.invoiceNumber}</span>
                </>
            ) : (
                <>
                    <small>Status</small>
                    <h4
                        style={{
                            color: "#16a34a",
                            fontWeight: "700",
                        }}
                    >
                        No Invoice Scanned
                    </h4>
                    <span>Please scan an invoice to begin.</span>
                </>
            )}
        </div>
    </div>

    <div
        className="status-badge"
        style={{
            background:
                !header
                    ? "#E8F8EC"
                    : header.status === "VERIFIED" ||
                      header.status === "COMPLETED"
                    ? "#E8F8EC"
                    : "#FFF4D6",

            color:
                !header
                    ? "#16A34A"
                    : header.status === "VERIFIED" ||
                      header.status === "COMPLETED"
                    ? "#16A34A"
                    : "#F59E0B",

            borderRadius: "20px",
            padding: "8px 18px",
            fontWeight: "700",
            fontSize: "13px",
            textTransform: "uppercase",
        }}
    >
        {!header
            ? "NO INVOICE SCANNED"
            : header.status === "VERIFIED" ||
              header.status === "COMPLETED"
            ? "COMPLETED"
            : "IN PROGRESS"}
    </div>
</div>

                {/* Scan area — fixed */}
                <div
                    className="scan-area"
                    onClick={() => scanRef.current?.focus()}
                >
                    <div className="scan-icon-wrapper">
                        <FaQrcode className={`scan-icon ${scanning ? 'scanning' : ''}`} />
                    </div>
                    <h4>Scan Part & Box Label</h4>
                    <p>{scanning ? 'Processing…' : 'Point scanner at barcode'}</p>
                    <input
                        ref={scanRef}
                        type="text"
                        className="partscan-input"
                        value={partBarcode}
                        autoFocus
                        onBlur={() => setTimeout(() => scanRef.current?.focus(), 150)}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        readOnly={scanning}
                    />
                    <div className="partscan-cursor" />
                </div>

                {/* Section title — fixed */}
                <div className="verification-title">Part Verification Status</div>

                {/* PARTS LIST — only this scrolls */}
                <div className="parts-list">
                    {parts.map((item, index) => {
                        const status = getStatus(item);
                        const countRows = getCountRows(item);

                        return (
                            <div
                                key={index}
                                className={`part-card ${status === 'Pending' ? 'pending-card' :
                                        status === 'In Progress' ? 'progress-card' :
                                            'verified-card'
                                    }`}
                            >
                                {/* Left: icon + details */}
                                <div className="part-left">
                                    <div className={`part-icon ${status === 'Pending' ? 'pending' :
                                            status === 'In Progress' ? 'progress' :
                                                'verified'
                                        }`}>
                                        {status === 'Verified'
                                            ? <FaCheckCircle />
                                            : <FaClock />
                                        }
                                    </div>
                                    <div className="part-details">
                                        {status === 'Verified' && (
                                            <small className="completed-text">Completed</small>
                                        )}
                                        <h5>{item.partNo}</h5>
                                        <small>Invoice Qty : {item.invoiceQty}</small>
                                        {status === 'In Progress' && (
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${getProgress(item)}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right: count rows + status */}
                                <div className="part-status">
                                    {countRows.map((row, i) => (
                                        <div key={i} className="count-row">
                                            <span className="count-type">{row.label}</span>
                                            <div className="count-display">
                                                <span className={`count-scanned ${row.scanned >= row.total ? 'count-done' : ''}`}>
                                                    {row.scanned}
                                                </span>
                                                <span className="count-sep">/</span>
                                                <span className="count-total">{row.total}</span>
                                            </div>
                                        </div>
                                    ))}
                                    <span className={
                                        status === 'Pending' ? 'status-pending' :
                                            status === 'In Progress' ? 'status-progress' :
                                                'status-verified'
                                    }>
                                        {status}
                                    </span>
                                </div>

                                <FaChevronRight className="right-arrow" />
                            </div>
                        );
                    })}
                </div>

                {/* CONFIRM BUTTON — fixed at bottom */}
                {canConfirm && (
                    <div className="btn-sticky">
                        <button
                            className="mconfirm-btn"
                            disabled={confirming}
                            onClick={handleConfirm}
                        >
                            {confirming ? 'Saving…' : 'Confirm & Save'}
                        </button>
                    </div>
                )}

            </div>

            <CModal
                visible={showVerifiedModal}
                onClose={() => setShowVerifiedModal(false)}
                alignment="center"
                backdrop="static"
            >
                <CModalBody className="text-center">

                    <div id="verified-print-label">

                        <h2
                            style={{
                                color: '#16a34a',
                                fontWeight: '700'
                            }}
                        >
                            VERIFIED
                        </h2>

                        <p>
                            Invoice No : {verifiedInvoice}
                        </p>

                        <QRCodeSVG
                            value={`VERIFIED-INVOICE:${verifiedInvoice}`}
                            size={180}
                            level="H"
                            includeMargin
                        />

                    </div>

                    <div className="d-flex justify-content-center gap-2 mt-3">

                        <button
                            className="btn btn-success"
                            onClick={handlePrintVerified}
                        >
                            Print QR
                        </button>

                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowVerifiedModal(false)}
                        >
                            Close
                        </button>

                    </div>
                </CModalBody>
            </CModal>
        </div>
    );
};

export default PartScan;
