Journal 2020-11-05 - Requests Module and Fixed Request Sequences
=========

Sometimes, in order for a UI to properly implement a "single" request, it actually needs to make a number of separate requests in a given sequence.  Currently, with the Requests Module and RequestBinding, there's no simple way to do that: The Requests Module and RequestBinding intentionally only deal with single requests.

Is there a way to compose RequestBindings to build up request sequences?



## Doing It With What We've Got

As always, before we can begin to abstract, we need to look at actual use cases.


### Use Case: File Upload With Pre-Authorization

Suppose we have to get an authorization token before the UI can upload a file to somewhere, and for whatever reason we don't want to even touch the file on our own server.  Could be for any reason: local regulations, company policy, trying to keep memory usage down, whatever.

The requests may look something like this:

- Get file upload token via our service.
- Use file upload token to upload file to file service.
- Add file reference to our service after successful file upload.

Going with the current Vue centric version of RequestBinding, it might look something like this:

```js
export default Vue.extend({
  data() {
    return {
      fileToUpload: /** @type {File | null} */ (null),
    };
  },

  computed: {
    fileTokenRequest() {
      return new RequestBinding(this, () => {
        return getFileUploadToken({ ...fileMeta });
      });
    },

    fileUploadRequest() {
      return new RequestBinding(this, () => {
        return postFileUpload({
          token: this.fileTokenRequest.data.getDataOr(null),
          file: this.fileToUpload,
          ...fileUploadMeta,
        });
      });
    },

    saveFileMetaRequest() {
      return new RequestBinding(this, () => {
        return postSaveFileMeta({ ...savedFileMeta });
      });
    },

    // Misc derivations, exact details not too important.
    fileMeta() {
      const { fileToUpload } = this;
      if (fileToUpload == null) return null;

      return getFileMeta(fileToUpload);
    },

    fileUploadmeta() {
      const { fileToUpload } = this;
      if (fileToUpload == null) return null;

      return getFileUploadMeta(fileToUpload);
    },

    savedFileMeta() {
      const { fileMeta } = this;

      if (fileMeta == null) return null;

      return this.fileTokenRequest.data
        .map(uploadData => {
          return someDerivationOf(uploadData, fileMeta);
        })
        .getDataOr(null);
    },
  },

  methods: {
    async uploadFile() {
      try {
        await this.fileTokenRequest.dispatchThenGetDataOrThrow();
        await this.fileUploadRequest.dispatchThenGetDataOrThrow();
        await this.saveFileMetaRequest.dispatchThenGetDataOrThrow();

        // Not really sure what else to do with it, so a tuple I guess.
        return this.fileTokenRequest.data.flatMap(tokenData =>
          this.fileUploadRequest.data.flatMap(uploadResult =>
            this.saveFileMetaRequest.data.map(metaSaveResult => [
              tokenData,
              uploadResult,
              metaSaveResult,
            ])
          )
        );
      } catch (error) {
        return AsyncData.Error(error);
      }
    },
  },
});
```
