'use strict';

/**
 * @module reports/patient.receipt
 *
 * @description
 * This module provides rendering for the patient receipt: a patient card.
 * A new patient card is automatically generated when the patient is registered
 * at the Patient Registration module.  Additionally, copies can be printed from
 * the Patient Record page.
 *
 * @requires Patients
 * @requires lodash
 * @requires lib/ReportManager
 */

const Patients = require ('../patients');
const _ = require('lodash');
const ReportManager = require('../../../lib/ReportManager');
const Locations = require('../../admin/locations');

const pdf = require ('../../../lib/renderers/pdf');

// detailed A6 patient identification
const CARD_TEMPLATE  = './server/controllers/medical/reports/patient.receipt.handlebars';

// reduced information, smaller more compact patient identification
// used by hospitals to save on card and ink required
const SIMPLE_CARD_TEMPLATE = './server/controllers/medical/reports/patient.simple.receipt.handlebars';

// POS receipt, quick proof of registration
const POS_TEMPLATE = './server/controllers/medical/reports/patient.pos.handlebars';

// default options for the patient card
const defaults = {
  pageSize : 'A6',
  orientation: 'landscape',
};

exports.build = build;

function build(req, res, next) {
  const qs = req.query;
  const options = _.defaults(qs, defaults);

  let report, template;

  let requestedPOSReceipt = Boolean(Number(options.posReceipt));
  let requestedSimplifiedCard = Boolean(Number(options.simplified));

  requestedSimplifiedCard = true;

  // if the POS option is selected, render a thermal receipt.
  if (requestedPOSReceipt) {
    _.assign(options, pdf.posReceiptOptions);
    template = POS_TEMPLATE;
  } else {
    // not a point of sale receipt
    // check to see if the client has requested a simplified card
    if (requestedSimplifiedCard) {
      _.assign(options, pdf.reducedCardOptions);
      template = SIMPLE_CARD_TEMPLATE;
    } else {
      // use standard card template
      template = CARD_TEMPLATE;
    }
  }

  try {
    report = new ReportManager(template, req.params, options);
  } catch (e) {
    return next(e);
  }

  const data = {};

  Patients.lookupPatient(req.params.uuid)
    .then(patient => {
      patient.enterprise_name = req.session.enterprise.name;
      patient.sexFormatted = (patient.sex === 'M') ? 'FORM.LABELS.MALE' : 'FORM.LABELS.FEMALE';

      data.patient = patient;
      return Locations.lookupVillage(patient.origin_location_id);
    })
    .then(village => {
      data.village = village;
      return report.render(data);
    })
    .then(result => {
      res.set(result.headers).send(result.report);
    })
    .catch(next)
    .done();
}
