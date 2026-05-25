(function (root) {
  "use strict";

  const StreamsModel = {
    async fetchLiveStreams() {
      const res = await fetch("/api/live-streams");
      const data = await res.json();
      return data.streams || [];
    }
  };

  root.StreamsModel = StreamsModel;
})(window);
