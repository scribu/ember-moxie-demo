/**
 * Load an attachment into memory.
 *
 * @param Blob file - The file to load
 * @return RSVP.Promise
 */
function loadAttachment(file) {
  return new Ember.RSVP.Promise(function(resolve, reject) {
    var reader = new mOxie.FileReader();

    reader.onloadend = function() {
      resolve(reader.result);
    };

    reader.onerror = function() {
      reject(reader.error);
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Send a file to the server.
 *
 * @param Blob file - The file info
 * @param String data - The binary file content
 * @return RSVP.Promise
 */
function uploadAttachment(file, data) {
  return new Ember.RSVP.Promise(function(resolve, reject) {
    var req = jQuery.post('/api/attachments', {
      filename: file.name,
      data: data
    });

    function successHandler(response) {
      resolve(response);
    }

    function errorHandler(xhr) {
      reject(xhr.responseText);
    }

    req.then(successHandler, errorHandler);
  });
}

App = Ember.Application.create({
  LOG_TRANSITIONS: true,
  LOG_VIEW_LOOKUPS: true
});

App.FilePicker = Ember.View.extend({
  didInsertElement: function() {
    var self = this;

    var fileInput = new mOxie.FileInput({
      browse_button: this.$('button').get(0),
      multiple: true
    });

    fileInput.onchange = function(e) {
      self.get('controller').send('addFiles', fileInput.files);
    };

    fileInput.init();
  }
});

App.IndexController = Ember.ObjectController.extend({
  errors: [],
  uploading: false,
  completed: 0,

  attachments: [],

  actions: {
    'addFiles': function(files) {
      var attachments = this.get('attachments');

      files.forEach(function(file) {
        if (!attachments.findBy('name', file.name)) {
          attachments.pushObject(file);
        }
      });
    },

    'removeFile': function(file) {
      var attachments = this.get('attachments');

      this.set('attachments', attachments.rejectBy('name', file.name));
    },

    'submit': function() {
      var self = this;

      var errors = [];

      var attachments = self.get('attachments');

      if (Ember.isEmpty(attachments)) {
        alert('You need to select some files to upload first.');
        return;
      }

      self.set('uploading', true);

      var promises = attachments.map(function(file) {
        return loadAttachment(file)
          .then(function(data) {
            return uploadAttachment(file, data);
          })
          .then(function success() {
            self.incrementProperty('completed');
          }, function error(error) {
            errors.push({ file: file.name, reason: error });
          });
      });

      Ember.RSVP.all(promises).then(function() {
        if (errors.length) {
          self.set('errors', errors);
        }

        self.set('uploading', false);

        self.set('attachments', []);
      });
    }
  }
});

jQuery.mockjax({
  url: '/api/attachments',
  responseText: "ok"
});
