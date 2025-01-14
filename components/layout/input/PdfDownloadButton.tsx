export function PDFDownloadButton() {
    return (
      <button 
        onClick={() => window.print()}
      >
        Save as PDF
      </button>
    );
  }