# An example where we mount part of the docker-host FS to the image's.
FROM busybox
VOLUME /beepboop
ADD beep.md /beepboop/beep.md
CMD ["/bin/cat", "/beepboop/beep.md"]
