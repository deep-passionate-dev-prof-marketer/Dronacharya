import React from "react";
import { MultiDeviceRemoteConsole } from "./MultiDeviceRemoteConsole";

/**
 * Backward-compatible wrapper forwarding to the MultiDeviceRemoteConsole.
 */
export const RemoteAccessModal: React.FC = () => {
  return <MultiDeviceRemoteConsole />;
};
