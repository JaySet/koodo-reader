import React from "react";
import "./popupTrans.css";
import { PopupTransProps, PopupTransState } from "./interface";
import StorageUtil from "../../../utils/service/configService";
import axios from "axios";
import { Trans } from "react-i18next";
import toast from "react-hot-toast";
import PluginService from "../../../utils/service/pluginService";
import Plugin from "../../../models/Plugin";
import { openExternalUrl } from "../../../utils/reader/urlUtil";
declare var window: any;
class PopupTrans extends React.Component<PopupTransProps, PopupTransState> {
  constructor(props: PopupTransProps) {
    super(props);
    this.state = {
      translatedText: "",
      originalText: "",
      transService: StorageUtil.getReaderConfig("transService") || "",
      transTarget: StorageUtil.getReaderConfig("transTarget"),
      transSource: StorageUtil.getReaderConfig("transSource"),
      isAddNew: false,
    };
  }
  componentDidMount() {
    let originalText = this.props.originalText.replace(/(\r\n|\n|\r)/gm, "");
    this.setState({ originalText: originalText });
    if (!this.state.transService) {
      this.setState({ isAddNew: true });
    }
    if (
      this.props.plugins.findIndex(
        (item) => item.identifier === this.state.transService
      ) === -1
    ) {
      this.setState({ isAddNew: true });
      return;
    }

    this.handleTrans(originalText);
  }
  handleTrans = (text: string) => {
    let plutin = this.props.plugins.find(
      (item) => item.identifier === this.state.transService
    );
    if (!plutin) {
      return;
    }
    let translateFunc = plutin.script;
    // eslint-disable-next-line no-eval
    eval(translateFunc);
    window
      .translate(
        text,
        StorageUtil.getReaderConfig("transSource") || "",
        StorageUtil.getReaderConfig("transTarget") || "en",
        axios,
        plutin.config
      )
      .then((res: string) => {
        if (res.startsWith("https://")) {
          window.open(res);
        } else {
          this.setState({
            translatedText: res,
          });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };
  handleChangeService(target: string) {
    this.setState({ transService: target }, () => {
      StorageUtil.setReaderConfig("transService", target);
      let plugin = this.props.plugins.find(
        (item) => item.identifier === this.state.transService
      );
      if (!plugin) {
        return;
      }
      let autoValue = plugin.autoValue;
      this.setState({ transSource: autoValue, transTarget: "en" }, () => {
        StorageUtil.setReaderConfig("transTarget", "en");
        StorageUtil.setReaderConfig("transSource", autoValue);
        this.handleTrans(this.props.originalText.replace(/(\r\n|\n|\r)/gm, ""));
      });
    });
  }
  render() {
    const renderNoteEditor = () => {
      return (
        <div className="trans-container">
          <div className="trans-service-selector-container">
            {this.props.plugins
              .filter((item) => item.type === "translation")
              .map((item, index) => {
                return (
                  <div
                    className={
                      this.state.transService === item.identifier
                        ? "trans-service-selector"
                        : "trans-service-selector-inactive"
                    }
                    onClick={() => {
                      this.setState({ isAddNew: false });
                      this.handleChangeService(item.identifier);
                    }}
                  >
                    <span className={`icon-${item.icon} trans-icon`}></span>
                    {item.displayName}
                  </div>
                );
              })}
            <div
              className="trans-service-selector-inactive"
              onClick={() => {
                this.setState({ isAddNew: true });
              }}
            >
              <span className="icon-add trans-add-icon"></span>
              <Trans>Add</Trans>
            </div>
          </div>
          {this.state.isAddNew && (
            <div
              className="trans-add-new-container"
              style={{ fontWeight: 500 }}
            >
              <textarea
                name="url"
                placeholder={this.props.t(
                  "Paste the code of the plugin here, check out document to learn how to get more plugins"
                )}
                id="trans-add-content-box"
                className="trans-add-content-box"
              />
              <div className="trans-add-button-container">
                <div
                  className="trans-add-cancel"
                  style={{ color: "#f16464" }}
                  onClick={() => {
                    if (
                      StorageUtil.getReaderConfig("lang") === "zhCN" ||
                      StorageUtil.getReaderConfig("lang") === "zhTW" ||
                      StorageUtil.getReaderConfig("lang") === "zhMO"
                    ) {
                      openExternalUrl("https://www.koodoreader.com/zh/plugin");
                    } else {
                      openExternalUrl("https://www.koodoreader.com/en/plugin");
                    }
                  }}
                >
                  <Trans>Document</Trans>
                </div>
                <div
                  className="trans-add-cancel"
                  onClick={() => {
                    this.setState({ isAddNew: false });
                  }}
                >
                  <Trans>Cancel</Trans>
                </div>
                <div
                  className="trans-add-confirm"
                  onClick={async () => {
                    let value: string = (
                      document.querySelector(
                        "#trans-add-content-box"
                      ) as HTMLTextAreaElement
                    ).value;
                    if (value) {
                      let plugin: Plugin = JSON.parse(value);
                      if (!(await PluginService.checkPlugin(plugin))) {
                        toast.error(this.props.t("Plugin verification failed"));
                        return;
                      }
                      if (
                        this.props.plugins.find(
                          (item) => item.identifier === plugin.identifier
                        )
                      ) {
                        await PluginService.updatePlugin(plugin);
                      } else {
                        await PluginService.savePlugin(plugin);
                      }
                      this.props.handleFetchPlugins();
                      toast.success(this.props.t("Addition successful"));
                    }
                    this.setState({
                      isAddNew: false,
                      translatedText: "Please select the service",
                    });
                  }}
                >
                  <Trans>Confirm</Trans>
                </div>
              </div>
            </div>
          )}
          {!this.state.isAddNew && (
            <>
              <div className="trans-lang-selector-container">
                <div className="original-lang-box">
                  <select
                    className="original-lang-selector"
                    style={{ maxWidth: "120px", margin: 0 }}
                    onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                      let targetLang = event.target.value;
                      StorageUtil.setReaderConfig("transSource", targetLang);
                      this.handleTrans(
                        this.props.originalText.replace(/(\r\n|\n|\r)/gm, "")
                      );
                    }}
                  >
                    {this.props.plugins.find(
                      (item) => item.identifier === this.state.transService
                    )?.langList &&
                      Object.keys(
                        this.props.plugins.find(
                          (item) => item.identifier === this.state.transService
                        )?.langList as any
                      ).map((item, index) => {
                        return (
                          <option
                            value={item}
                            key={index}
                            className="add-dialog-shelf-list-option"
                            selected={
                              StorageUtil.getReaderConfig("transSource") ===
                              item
                                ? true
                                : false
                            }
                          >
                            {
                              Object.values(
                                this.props.plugins.find(
                                  (item) =>
                                    item.identifier === this.state.transService
                                )?.langList as any[]
                              )[index]
                            }
                          </option>
                        );
                      })}
                  </select>
                </div>
                <div className="trans-lang-box">
                  <select
                    className="trans-lang-selector"
                    style={{ maxWidth: "120px", margin: 0 }}
                    onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                      let targetLang = event.target.value;
                      StorageUtil.setReaderConfig("transTarget", targetLang);
                      this.handleTrans(
                        this.props.originalText.replace(/(\r\n|\n|\r)/gm, "")
                      );
                    }}
                  >
                    {this.props.plugins.find(
                      (item) => item.identifier === this.state.transService
                    )?.langList &&
                      Object.keys(
                        this.props.plugins.find(
                          (item) => item.identifier === this.state.transService
                        )?.langList as any
                      ).map((item, index) => {
                        return (
                          <option
                            value={item}
                            key={index}
                            className="add-dialog-shelf-list-option"
                            selected={
                              StorageUtil.getReaderConfig("transTarget") ===
                              item
                                ? true
                                : false
                            }
                          >
                            {
                              Object.values(
                                this.props.plugins.find(
                                  (item) =>
                                    item.identifier === this.state.transService
                                )?.langList as any[]
                              )[index]
                            }
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>
              <div className="trans-box">
                <div className="original-text-box">
                  <div className="original-text">{this.state.originalText}</div>
                </div>
                <div className="trans-text-box">
                  <div className="trans-text">{this.state.translatedText}</div>
                </div>
              </div>
            </>
          )}
        </div>
      );
    };

    return renderNoteEditor();
  }
}
export default PopupTrans;
