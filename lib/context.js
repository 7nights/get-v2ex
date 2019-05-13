let context;

module.exports = {
  setContext(app) {
    context = app;
  },
  get context() {
    return context;
  }
};
