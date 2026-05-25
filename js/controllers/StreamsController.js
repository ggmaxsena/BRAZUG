(function () {
  "use strict";

  const StreamsController = {
    async init() {
      const container = document.getElementById("streams-list");
      const statusEl = document.getElementById("streams-status");
      
      try {
        const streams = await StreamsModel.fetchLiveStreams();
        StreamsView.renderList(streams, container, statusEl);
      } catch (e) {
        if (statusEl) statusEl.textContent = "Erro ao buscar lives.";
        console.error(e);
      }
    }
  };

  document.addEventListener("DOMContentLoaded", () => StreamsController.init());
})();
