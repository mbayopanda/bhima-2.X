/* eslint global-require: "off" */
const { expect } = require('chai');
const rewire = require('rewire');
const util = require('util');
const path = require('path');
const fs = require('fs');
const exec = util.promisify(require('child_process').exec);

const pdf = rewire('../../server/lib/renderers/pdf');
pdf.__set__('html', { render : noop });

// mock handlebars template file
const template = 'test/fixtures/file.handlebars';

// mock data
const data = {
  developer : 'developer',
  message : 'You are a tourist :-)',
  developer_message : 'You are a developer',
  lang : 'fr',
};

const fixturesPath = path.resolve('test/fixtures');
const htmlFile = path.join(fixturesPath, '/pdf-sample.html');
const generatedFile = path.join(fixturesPath, '/pdf-sample.pdf');

function PDFRenderUnitTest() {
  it('#wkhtmltopdf() creates correctly a PDF file from an HTML', async () => {
    const wk = await exec(`wkhtmltopdf ${htmlFile} ${generatedFile}`);
  });

  it('#pdf.render() renders a valid PDF file', async () => {
    const result = await pdf.render(data, template, {});
    const hasValidVersion = hasValidPdfVersion(result.toString());
    const isBuffer = isBufferInstance(result);
    expect(isBuffer && hasValidVersion).to.be.equal(true);
  });

  it.skip('#pdf.render() renders as well #wkhtmltopdf the same PDF file from an HTML', async () => {
    const result = await pdf.render({}, htmlFile, {});
    const renderGenerated = result.toString();

    const hasValidVersion = hasValidPdfVersion(renderGenerated);
    const isBuffer = isBufferInstance(result);
    expect(isBuffer && hasValidVersion).to.be.equal(true);

    // TODO: need a better to compare
    // const wkGenerated = readFileToString(generatedFile);
    // expect(renderGenerated).to.be.equal(wkGenerated);
  });
}

/**
 * hasValidPdfVersion
 * @description check if the pdf version is valid
 * @param {string} fileInString the pdf file in string
 */
function hasValidPdfVersion(fileInString) {
  const pdfHeader = fileInString.substr(0, 8); // This gets the first 8 bytes/characters of the file
  const regex = new RegExp(/%PDF-1.[0-7]/); // This Regular Expression is used to check if the file is valid
  const result = pdfHeader.match(regex);
  return !!(result.length);
}

/**
 * @description check if the given file is an instance of Buffer
 * @param {object} file
 */
function isBufferInstance(file) {
  return file instanceof Buffer;
}

function readFileToString(filePath) {
  const file = fs.readFileSync(filePath);
  return file.toString();
}

function noop() {
  return new Promise(resolve => resolve());
}

describe('PDF renderer', PDFRenderUnitTest);
