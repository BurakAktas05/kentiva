import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { getStoredAccessToken, type Report } from '../api';
import { getSockJsUrl } from '../lib/env';

type StompMessage = {
  body: string;
};

export function useMunicipalityReportFeed(
  municipalityId: string | undefined,
  onReport: (report: Report) => void,
) {
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef(onReport);
  useEffect(() => {
    handlerRef.current = onReport;
  }, [onReport]);

  useEffect(() => {
    if (!municipalityId) {
      setConnected(false);
      return;
    }
    const token = getStoredAccessToken();
    if (!token) {
      setConnected(false);
      return;
    }

    const socket = new SockJS(getSockJsUrl());
    const StompObj = (Stomp as any).default || Stomp;
    const stompClient = StompObj.over(socket);
    stompClient.debug = () => {};
    const topic = `/topic/municipality/${municipalityId}/reports`;
    const connectHeaders = { Authorization: `Bearer ${token}` };

    stompClient.connect(
      connectHeaders,
      () => {
        setConnected(true);
        stompClient.subscribe(topic, (msg: StompMessage) => {
          try {
            const report = JSON.parse(msg.body) as Report;
            if (report?.id) {
              handlerRef.current(report);
            }
          } catch {
            /* ignore malformed */
          }
        });
      },
      () => setConnected(false),
    );

    return () => {
      try {
        stompClient.disconnect(() => {});
      } catch {
        /* ignore */
      }
      setConnected(false);
    };
  }, [municipalityId]);

  return { connected };
}
