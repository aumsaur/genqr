// Stand-in for jsPDF's optional dependencies (html2canvas, dompurify, canvg).
// jsPDF only loads them for doc.html() and SVG images, which this app never calls;
// vite.config.js points them here so they stay out of the build.
export default null;
