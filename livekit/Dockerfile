FROM livekit/livekit-server@sha256:2c13cbf2edcbf13ea7b20d05c10b394d04d8fb3fe358269cff845a90b4de9576

COPY --chmod=755 entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

EXPOSE 7880/tcp 7881/tcp 7882/udp
