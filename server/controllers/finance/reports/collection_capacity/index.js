/**
 * @overview ./finance/reports/collection_capacity/
 */

const _ = require('lodash');
const moment = require('moment');

const ReportManager = require('../../../../lib/ReportManager');
const db = require('../../../../lib/db');

module.exports.report = report;

// path to the template to render
const TEMPLATE = './server/controllers/finance/reports/collection_capacity/report.handlebars';

const DEFAULT_OPTIONS = {
  orientation : 'portrait',
};

/**
 * @method report
 *
 * @description
 * The HTTP interface which actually creates the report.
 */
async function report(req, res, next) {
  try {
    const qs = _.extend(req.query, DEFAULT_OPTIONS);
    const { dateFrom, dateTo } = req.query;
    const metadata = _.clone(req.session);

    const rpt = new ReportManager(TEMPLATE, metadata, qs);

    const CASH_PAYMENT_TRANSACTION_TYPE = 2;
    const CAUTION_TRANSACTION_TYPE = 19;
    const INVOICE_TRANSACTION_TYPE = 11;
    const INCOME_ACCOUNT_TYPE = 4;

    /**
     * credit to :
     * https://www.shayanderson.com/mysql/generating-a-series-of-dates-in-mysql.htm
     */
    const dateRange = `
      SELECT DATE(cal.date) date
      FROM (
            SELECT
              SUBDATE(DATE(?), INTERVAL DATEDIFF(DATE(?), DATE(?)) DAY) + INTERVAL xc DAY AS date
            FROM (
                  SELECT @xi:=@xi+1 as xc from
                  (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) xc1,
                  (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) xc2,
                  (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) xc3,
                  (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) xc4,
                  (SELECT @xi:=-1) xc0
            ) xxc1
      ) cal
      WHERE cal.date <= DATE(?)
      ORDER BY cal.date ASC
    `;

    const patients = `
      SELECT DATE(p.registration_date) AS registration_date, COUNT(*) registrations
      FROM patient p 
      WHERE DATE(p.registration_date) BETWEEN DATE(?) AND DATE(?)
      GROUP BY DATE(p.registration_date)
    `;

    const invoices = `
      SELECT DATE(gl.trans_date) invoice_date, SUM(IFNULL(credit_equiv - debit_equiv, 0)) AS total_invoiced 
      FROM general_ledger gl
      JOIN invoice i ON i.uuid = gl.record_uuid
      JOIN account a ON a.id = gl.account_id
      WHERE gl.transaction_type_id IN (${INVOICE_TRANSACTION_TYPE})
        AND (DATE(gl.trans_date) >= DATE(?) AND DATE(gl.trans_date) <= DATE(?))
        AND i.reversed = 0 AND a.type_id = ${INCOME_ACCOUNT_TYPE}
      GROUP BY DATE(gl.trans_date)
    `;

    const payments = `
      SELECT DATE(gl.trans_date) trans_date, SUM(IFNULL(debit_equiv - credit_equiv, 0)) AS total_paid 
      FROM general_ledger gl
      JOIN cash c ON c.uuid = gl.record_uuid
      WHERE gl.transaction_type_id IN (${CASH_PAYMENT_TRANSACTION_TYPE}, ${CAUTION_TRANSACTION_TYPE})
        AND (DATE(gl.trans_date) >= DATE(?) AND DATE(gl.trans_date) <= DATE(?))
        AND gl.account_id IN (?) AND c.reversed = 0 
      GROUP BY DATE(gl.trans_date)
    `;

    const query = `
      SELECT 
        d.date, IFNULL(pa.registrations, 0) registrations, i.total_invoiced, IFNULL(p.total_paid, 0) total_paid,
        IF(pa.registrations <> 0, (IFNULL(i.total_invoiced, 0) / pa.registrations), 0) avg_cost,
        IF(i.total_invoiced <> 0, (IFNULL(p.total_paid, 0) / i.total_invoiced), 0) recovery_capacity
      FROM (${dateRange}) d
      LEFT JOIN (${invoices}) i ON i.invoice_date = d.date
      LEFT JOIN (${payments}) p ON p.trans_date = d.date
      LEFT JOIN (${patients}) pa ON pa.registration_date = d.date
      ORDER BY d.date
    `;

    const queryAuxiliaryCashboxes = `
      SELECT cac.account_id AS id FROM cash_box_account_currency cac 
      JOIN cash_box cb ON cb.id = cac.cash_box_id
      WHERE cb.is_auxiliary = 1;
    `;

    const auxiliaryCashboxesAccountRows = await db.exec(queryAuxiliaryCashboxes);
    const auxiliaryCashboxesAccountIds = auxiliaryCashboxesAccountRows.map(item => item.id);

    const formatedDateFrom = moment(dateFrom).format('YYYY-MM-DD');
    const formatedDateTo = moment(dateTo).format('YYYY-MM-DD');

    const parameters = [
      formatedDateTo, formatedDateTo, formatedDateFrom, formatedDateTo,
      formatedDateFrom, formatedDateTo,
      formatedDateFrom, formatedDateTo, auxiliaryCashboxesAccountIds,
      formatedDateFrom, formatedDateTo,
    ];

    const rows = await db.exec(query, parameters);

    const result = await rpt.render({
      dateFrom,
      dateTo,
      rows,
    });

    res.set(result.headers).send(result.report);
  } catch (e) {
    next(e);
  }
}
