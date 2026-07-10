import React, { useState, useEffect, useRef } from 'react';
import { CButton, CCard, CCardBody, CFormSelect, CFormInput } from '@coreui/react';
import scanInvoiceImg from '../../assets/images/scaninvoice.png';
import DataTable from 'react-data-table-component';
import { toast } from 'react-toastify';
import { FaSave, FaUndo, FaFileInvoice, FaCube, FaArrowLeft, } from 'react-icons/fa';
import '../../assets/CSS/scaninvoice.css';
import API from '../../api.js';
import { useNavigate } from 'react-router-dom';

const ScanInvoice = () => {

    const customTableStyles = {
        headRow: {
            style: {
                backgroundColor: '#0b43b5',
                minHeight: '36px',
            },
        },
        headCells: {
            style: {
                backgroundColor: '#0b43b5',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '12px',
            },
        },
    };
    const [customer, setCustomer] = useState('');
    const [customers, setCustomers] = useState([]);
    const [scanData, setScanData] = useState([]);
    const scanRef = useRef(null);
    const scanTimer = useRef(null);
    const navigate = useNavigate();
    const [savedDispatchId, setSavedDispatchId] = useState('');
    const [invoiceNo, setInvoiceNo] = useState('');
    const [dispatchId, setDispatchId] = useState('');
    const [cancelLoading, setCancelLoading] = useState(false);



    useEffect(() => {
        loadCustomers();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            scanRef.current?.focus();
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    const loadCustomers = async () => {
        try {
            const res = await API.get('/customer');
            setCustomers(res.data);
        } catch (err) {

            console.error(err);
            toast.error('Failed to load customers')
        }
    };
    const handleSave = async () => {
        if (!customer) {
            toast.error("Please select customer");
            return;
        }

        if (scanData.length === 0) {
            toast.warning("No data scanned");
            return;
        }

        try {
            const user = JSON.parse(
                sessionStorage.getItem("user") || "{}"
            );

            const res = await API.post("/invoices/bulk", {
                customerId: Number(customer),
                createdBy: user?.id,
                invoices: scanData
            });

            setSavedDispatchId(
                res.data.despatchID
            );

            toast.success(
                `Saved Successfully - ${res.data.DespatchID || res.data.despatchID
                }`
            );

            setScanData([]);
            setCustomer("");

            // Navigate after 3 seconds
            setTimeout(() => {
                navigate("/mobiletransaction/partscan");
            }, 3000);

        } catch (error) {
            console.error(error);
            toast.error("Save Failed");
        }
    };

    const handleCancel = async () => {

        // Grid clear only
        if (scanData.length > 0 && !dispatchId) {

            setScanData([]);
            setCustomer('');

            if (scanRef.current) {
                scanRef.current.value = '';
                scanRef.current.focus();
            }

            toast.info('Grid Cleared');
            return;
        }

        // Cancel saved invoice from DB
        if (dispatchId) {

            try {

                setCancelLoading(true);

                const user = JSON.parse(
                    sessionStorage.getItem("user") || "{}"
                );

                const res = await API.put(
                    `/Invoices/cancel-dispatch/${dispatchId}`,
                    {
                        userId: user.id
                    }
                );

                toast.success(res.data.message);

                setDispatchId('');
                setInvoiceNo('');
                setScanData([]);
                setCustomer('');
            }
            catch (err) {

                toast.error(
                    err?.response?.data?.message ||
                    'Cancel Failed'
                );
            }
            finally {
                setCancelLoading(false);
            }
        }
    };


    const totalRecords = scanData.length;

    const totalQty = scanData.reduce(
        (sum, item) => sum + Number(item.qty),
        0
    );


    const processQRCode = async (rawValue) => {
        if (!customer) {
            toast.error("Please Select Customer");
            return;
        }

        try {
            const tokens = rawValue
                .replace(/\r/g, " ")
                .replace(/\n/g, " ")
                .trim()
                .split(/\s+/)
                .filter(Boolean);


            // Invoice Number
            const invoiceToken = tokens.find(t => /107\d{7}/.test(t)) || "";
            const invoiceMatch = invoiceToken.match(/107\d{7}/);
            const invoiceNo = invoiceMatch?.[0] || "";

            if (
                scanData.length > 0 &&
                scanData[0].invoiceNo !== invoiceNo
            ) {
                toast.warning(
                    `Invoice ${scanData[0].invoiceNo} already scanned. Please Save/Cancel before scanning another invoice.`
                );

                if (scanRef.current) {
                    scanRef.current.value = "";
                    scanRef.current.focus();
                }

                return;
            }

            if (!invoiceNo) {
                toast.error("No Valid Invoice Found");
                if (scanRef.current) {
                    scanRef.current.value = "";
                    scanRef.current.focus();
                }
                return;
            }

            const user = JSON.parse(
                sessionStorage.getItem("user") || "{}"
            );

            const checkRes = await API.get(
                "/invoices/checkinvoice",
                {
                    params: {
                        invoiceNo,
                        userId: user.id
                    }
                }
            );

            if (checkRes.data.exists) {

                toast.warning(
                    checkRes.data.message
                );

                scanRef.current.value = "";
                scanRef.current.focus();

                return;
            }

            if (checkRes.data === true) {

                toast.warning(
                    `Invoice No ${invoiceNo} Already Scanned`
                );

                if (scanRef.current) {
                    scanRef.current.value = "";
                    scanRef.current.focus();
                }

                return;
            }

            // All Chennai parts
            const chennaiParts = tokens
                .filter(t => /28700T\d{4}/.test(t))
                .map(t => t.match(/28700T\d{4}/)?.[0])
                .filter(Boolean);

            // All Pune parts
            const puneParts = tokens
                .filter(t => /285\d{7}[A-Z]?/.test(t))
                .map(t => t.match(/285\d{7}[A-Z]?/)?.[0])
                .filter(Boolean);

            const allParts = [...chennaiParts, ...puneParts];

            if (allParts.length === 0) {
                toast.error("No Valid Parts Found");
                if (scanRef.current) {
                    scanRef.current.value = "";
                    scanRef.current.focus();
                }
                return;
            }

            // Date+qty tokens in order
            const dateQtyTokens = tokens.filter(t =>
                /^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(20\d{2})\d+$/.test(t)
            );

            const parseQty = (token) => {
                const match = token?.match(
                    /^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(20\d{2})(\d+)$/
                );
                return match ? Number(match[4]) : 0;
            };

            let addedCount = 0;
            let skippedCount = 0;

            setScanData(prev => {
                const updated = [...prev];

                allParts.forEach((partNo, index) => {
                    const qty = parseQty(dateQtyTokens[index] || "");

                    const exists = updated.findIndex(
                        x => x.invoiceNo === invoiceNo && x.partNo === partNo
                    );

                    if (exists >= 0) {
                        skippedCount++;
                        return;
                    }

                    updated.push({ invoiceNo, partNo, qty });
                    addedCount++;
                });

                return updated;
            });

            if (skippedCount > 0 && addedCount === 0) {
                toast.warning(`Invoice ${invoiceNo} Already Scanned`);
            } else if (addedCount > 0) {
                toast.success(`Invoice ${invoiceNo}: ${addedCount} Part(s) Added`);
            }

            if (scanRef.current) {
                scanRef.current.value = "";
                scanRef.current.focus();
            }

        } catch (err) {
            console.error(err);
            toast.error("Invalid QR Format");
            if (scanRef.current) {
                scanRef.current.value = "";
                scanRef.current.focus();
            }
        }
    };
    const columns = [
        {
            name: 'S.NO',
            width: '90px',
            cell: (row, index) => (
                <div
                    style={{
                        width: '100%',
                        textAlign: 'center'
                    }}
                >
                    {index + 1}
                </div>
            ),
        },
        {
            name: 'INVOICE NUMBER',
            selector: row => row.invoiceNo,
        },
        {
            name: 'PART NUMBER',
            selector: row => row.partNo,
        },
        {
            name: 'QTY',
            selector: row => row.qty,
            width: '100px',
        },
    ];

    const searchInvoice = async () => {
           if (!invoiceNo || invoiceNo.trim() === "") {
        toast.warning("Please enter the Invoice Number");
        return;
    }
        try {
            const res = await API.get(
                `/Invoices/invoice/${invoiceNo}`
            );

            setDispatchId(res.data.despatchID);

            setScanData(
                res.data.invoices.map(x => ({
                    invoiceNo: x.invoice_Number,
                    partNo: x.part_Number,
                    qty: x.quantity
                }))
            );

            toast.success(
                `Dispatch Found : ${res.data.despatchID}`
            );
        }
        catch (error) {
            setScanData([]);

            toast.error(
                error?.response?.data?.message ||
                error?.response?.data?.Message ||
                "Something went wrong"
            );
        }
    };

    return (
        <div className="scan-container">

            <div className="scan-header">
                <div>
                    <h3>SCAN INVOICE</h3>
                    <p>Scan and verify Invoice labels</p>
                </div>

                <div
                    className="mobility-back-icon"
                    onClick={() => navigate(-1)}
                    title="Back"
                >
                    <FaArrowLeft />
                </div>
            </div>

            <div className="scan-body">
                <label className="scan-label">
                    Customer Name
                    <span className="required"> *</span>
                </label>

                <CFormSelect
                    value={customer}
                    onChange={(e) => {
                        setCustomer(e.target.value);

                        setTimeout(() => {
                            scanRef.current?.focus();
                        }, 100);
                    }}
                >
                    <option value="">
                        Select Customer
                    </option>

                    {customers.map((item) => (
                        <option
                            key={item.customerId}
                            value={item.customerId}
                        >
                            {item.customerName}
                        </option>
                    ))}
                </CFormSelect>

                <div
                    className="scanner-box"
                    onClick={() =>
                        scanRef.current?.focus()
                    }
                >
                    <img
                        src={scanInvoiceImg}
                        alt="Scan Invoice"
                        className="scanner-image"
                    />

                    <input
                        ref={scanRef}
                        type="text"
                        className="scanner-input"
                        autoFocus
                        onChange={(e) => {
                            clearTimeout(scanTimer.current);

                            scanTimer.current = setTimeout(async () => {
                                const value = e.target.value.trim();

                                if (!value) return;

                                await processQRCode(value);

                                e.target.value = "";
                            }, 800);
                        }}
                    />
                    <div className="scan-cursor"></div>
                </div>

                <div className="summary-row">
                    <CCard className="summary-card">
                        <CCardBody className="summary-content">
                            <div className="summary-icon invoice-icon">
                                <FaFileInvoice />
                            </div>
                            <div>
                                <small>Total Records</small>
                                <h4>{totalRecords}</h4>
                            </div>
                        </CCardBody>
                    </CCard>

                    <CCard className="summary-card">
                        <CCardBody className="summary-content">
                            <div className="summary-icon qty-icon">
                                <FaCube />
                            </div>
                            <div>
                                <small>Total Quantity</small>
                                <h4>{totalQty}</h4>
                            </div>

                        </CCardBody>
                    </CCard>
                </div>

                <div className="scan-table">
                    <div className="mtable-title">
                        Scanned Details
                    </div>

                    <div className="search-panel">
                        <CFormInput
                            className="search-input"
                           placeholder="Enter Invoice Number to Cancel"
                            value={invoiceNo}
                            onChange={(e) => setInvoiceNo(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    searchInvoice();
                                }
                            }}
                        />

                        <CButton
                            className="search-btn"
                            color="primary"
                            onClick={searchInvoice}
                        >
                            Search
                        </CButton>
                    </div>
                    <DataTable
                        columns={columns}
                        data={scanData}
                        pagination
                        fixedHeader
                        fixedHeaderScrollHeight="180px"
                        dense
                        striped
                        responsive
                        highlightOnHover
                        persistTableHead
                        noDataComponent="No Invoice Scanned"
                        customStyles={customTableStyles}
                    />
                </div>
                <div className="btn-row">

                    <CButton
                        className="cancel-btn"
                        onClick={handleCancel}
                        disabled={cancelLoading}
                    >
                        {cancelLoading ? (
                            <>
                                <span
                                    className="spinner-border spinner-border-sm me-2"
                                />
                                Cancelling...
                            </>
                        ) : (
                            <>
                                <FaUndo />
                                <span style={{ marginLeft: '6px' }}>
                                    Cancel
                                </span>
                            </>
                        )}
                    </CButton>

                    <CButton
                        className="msave-btn"
                        onClick={handleSave}
                    >
                        <FaSave />
                        <span style={{ marginLeft: '6px' }}>
                            Save
                        </span>
                    </CButton>
                </div>
            </div>
        </div>
    );
};

export default ScanInvoice;