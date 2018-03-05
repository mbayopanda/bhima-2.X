/* eslint global-require: "off" */
const { expect } = require('chai');
const rewire = require('rewire');

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

function PDFRenderUnitTest() {
  it('#pdf.render() renders correctly a pdf file', async () => {
    const result = await pdf.render(data, template, {});
    console.log(result);
  });
}

function noop() {
  return new Promise(resolve => resolve());
}

describe('PDF renderer', PDFRenderUnitTest);
