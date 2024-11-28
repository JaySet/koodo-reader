import StorageUtil from "../service/configService";
import { isElectron } from "react-device-detect";

import BookModel from "../../models/Book";
import toast from "react-hot-toast";
import { copyArrayBuffer, getStorageLocation } from "../common";
import iconv from "iconv-lite";
import { Buffer } from "buffer";
import { base64ToArrayBufferAndExtension } from "../sync/common";
declare var window: any;

class BookUtil {
  static addBook(key: string, foramt: string, buffer: ArrayBuffer) {
    if (isElectron) {
      const fs = window.require("fs");
      const path = window.require("path");
      const dataPath = getStorageLocation() || "";
      try {
        if (!fs.existsSync(path.join(dataPath, "book"))) {
          fs.mkdirSync(path.join(dataPath, "book"));
        }
        fs.writeFileSync(
          path.join(dataPath, "book", key + "." + foramt),
          Buffer.from(buffer)
        );
      } catch (error) {
        throw error;
      }
    } else {
      return window.localforage.setItem(key, buffer);
    }
  }
  static deleteBook(key: string, format: string) {
    if (isElectron) {
      const fs_extra = window.require("fs-extra");
      const path = window.require("path");
      const dataPath = getStorageLocation() || "";
      return new Promise<void>((resolve, reject) => {
        try {
          fs_extra.remove(
            path.join(dataPath, `book`, key + "." + format),
            (err) => {
              if (err) throw err;
              resolve();
            }
          );
        } catch (e) {
          reject();
        }
      });
    } else {
      return window.localforage.removeItem(key);
    }
  }
  static isBookExist(key: string, format: string, bookPath: string) {
    return new Promise<boolean>((resolve, reject) => {
      if (isElectron) {
        var fs = window.require("fs");
        var path = window.require("path");
        let _bookPath = path.join(
          getStorageLocation() || "",
          `book`,
          key + "." + format
        );

        if (key.startsWith("cache")) {
          resolve(fs.existsSync(_bookPath));
        } else if (
          (bookPath && fs.existsSync(bookPath)) ||
          fs.existsSync(_bookPath)
        ) {
          resolve(true);
        } else {
          resolve(false);
        }
      } else {
        window.localforage.getItem(key).then((result) => {
          if (result) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
      }
    });
  }
  static getCover(book: BookModel) {
    if (isElectron) {
      var fs = window.require("fs");
      var path = window.require("path");
      let directoryPath = path.join(getStorageLocation() || "", "cover");
      const files = fs.readdirSync(directoryPath);
      const imageFiles = files.filter((file) => file.startsWith(book.key));
      if (imageFiles.length === 0) {
        return book.cover;
      }
      let format = imageFiles[0].split(".")[1];
      const imageFilePath = path.join(directoryPath, imageFiles[0]);
      let buffer = fs.readFileSync(imageFilePath);
      return `data:image/${format};base64,${buffer.toString("base64")}`;
    } else {
      return book.cover;
    }
  }
  static isCoverExist(book: BookModel) {
    if (isElectron) {
      var fs = window.require("fs");
      var path = window.require("path");
      let directoryPath = path.join(getStorageLocation() || "", "cover");
      if (!fs.existsSync(directoryPath)) {
        return false;
      }
      const files = fs.readdirSync(directoryPath);
      const imageFiles = files.filter((file) => file.startsWith(book.key));
      console.log(imageFiles);
      return imageFiles.length > 0;
    } else {
      return book.cover !== "";
    }
  }
  static deleteCover(key: string) {
    if (isElectron) {
      var fs = window.require("fs");
      var path = window.require("path");
      let directoryPath = path.join(getStorageLocation() || "", "cover");
      const files = fs.readdirSync(directoryPath);
      const imageFiles = files.filter((file) => file.startsWith(key));
      if (imageFiles.length === 0) {
        return;
      }
      const imageFilePath = path.join(directoryPath, imageFiles[0]);
      fs.unlinkSync(imageFilePath);
    }
  }
  static fetchBook(
    key: string,
    format: string,
    isArrayBuffer: boolean = false,
    bookPath: string
  ) {
    if (isElectron) {
      return new Promise<File | ArrayBuffer | boolean>((resolve, reject) => {
        var fs = window.require("fs");
        var path = window.require("path");
        let _bookPath = path.join(
          getStorageLocation() || "",
          `book`,
          key + "." + format
        );
        var data;
        if (fs.existsSync(_bookPath)) {
          data = fs.readFileSync(_bookPath);
        } else if (bookPath && fs.existsSync(bookPath)) {
          data = fs.readFileSync(bookPath);
        } else {
          resolve(false);
        }

        let blobTemp = new Blob([data]);
        let fileTemp = new File([blobTemp], "data", {
          lastModified: new Date().getTime(),
          type: blobTemp.type,
        });
        if (isArrayBuffer) {
          resolve(new Uint8Array(data).buffer);
        } else {
          resolve(fileTemp);
        }
      });
    } else {
      return window.localforage.getItem(key);
    }
  }
  static FetchAllBooks(Books: BookModel[]) {
    return Books.map((item) => {
      return this.fetchBook(
        item.key,
        item.format.toLowerCase(),
        true,
        item.path
      );
    });
  }
  static async RedirectBook(
    book: BookModel,
    t: (string) => string,
    history: any
  ) {
    if (
      !(await this.isBookExist(book.key, book.format.toLowerCase(), book.path))
    ) {
      toast.error(t("Book not exist"));
      return;
    }
    let ref = book.format.toLowerCase();

    if (isElectron) {
      if (StorageUtil.getReaderConfig("isOpenInMain") === "yes") {
        window.require("electron").ipcRenderer.invoke("new-tab", {
          url: `${window.location.href.split("#")[0]}#/${ref}/${
            book.key
          }?title=${book.name}&file=${book.key}`,
        });
      } else {
        const { ipcRenderer } = window.require("electron");
        ipcRenderer.invoke("open-book", {
          url: `${window.location.href.split("#")[0]}#/${ref}/${
            book.key
          }?title=${book.name}&file=${book.key}`,
          isMergeWord: StorageUtil.getReaderConfig("isMergeWord"),
          isAutoFullscreen: StorageUtil.getReaderConfig("isAutoFullscreen"),
          isPreventSleep: StorageUtil.getReaderConfig("isPreventSleep"),
        });
      }
    } else {
      window.open(
        `${window.location.href.split("#")[0]}#/${ref}/${book.key}?title=${
          book.name
        }&file=${book.key}`
      );
    }
  }
  static getBookUrl(book: BookModel) {
    let ref = book.format.toLowerCase();
    return `/${ref}/${book.key}`;
  }
  static reloadBooks() {
    if (isElectron) {
      if (StorageUtil.getReaderConfig("isOpenInMain") === "yes") {
        window.require("electron").ipcRenderer.invoke("reload-tab", "ping");
      } else {
        window.require("electron").ipcRenderer.invoke("reload-reader", "ping");
      }
    } else {
      window.location.reload();
    }
  }
  static getRendtion = (
    result: ArrayBuffer,
    format: string,
    readerMode: string,
    charset: string,
    animation: string
  ) => {
    let rendition;
    if (format === "CACHE") {
      rendition = new window.Kookit.CacheRender(result, readerMode, animation);
    } else if (format === "MOBI" || format === "AZW3" || format === "AZW") {
      rendition = new window.Kookit.MobiRender(result, readerMode, animation);
    } else if (format === "EPUB") {
      rendition = new window.Kookit.EpubRender(result, readerMode, animation);
    } else if (format === "TXT") {
      let text = iconv.decode(Buffer.from(result), charset || "utf8");
      rendition = new window.Kookit.TxtRender(text, readerMode, animation);
    } else if (format === "MD") {
      rendition = new window.Kookit.MdRender(result, readerMode, animation);
    } else if (format === "PDF") {
      rendition = new window.Kookit.PdfRender(result, readerMode, animation);
    } else if (format === "FB2") {
      rendition = new window.Kookit.Fb2Render(result, readerMode, animation);
    } else if (format === "DOCX") {
      rendition = new window.Kookit.DocxRender(result, readerMode, animation);
    } else if (
      format === "HTML" ||
      format === "XHTML" ||
      format === "MHTML" ||
      format === "HTM" ||
      format === "XML"
    ) {
      rendition = new window.Kookit.HtmlRender(
        result,
        readerMode,
        format,
        animation
      );
    } else if (
      format === "CBR" ||
      format === "CBT" ||
      format === "CBZ" ||
      format === "CB7"
    ) {
      rendition = new window.Kookit.ComicRender(
        copyArrayBuffer(result),
        readerMode,
        format,
        animation
      );
    }
    return rendition;
  };
  static addCover(book: BookModel) {
    console.log(book);
    if (!book.cover) return;
    if (isElectron) {
      var fs = window.require("fs");
      var path = window.require("path");
      let directoryPath = path.join(getStorageLocation() || "", "cover");
      if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath);
      }
      const result = base64ToArrayBufferAndExtension(book.cover);
      fs.writeFileSync(
        path.join(directoryPath, `${book.key}.${result.extension}`),
        Buffer.from(result.arrayBuffer)
      );
      book.cover = "";
    }
  }
  static generateBook(
    bookName: string,
    extension: string,
    md5: string,
    size: number,
    path: string,
    file_content: ArrayBuffer
  ) {
    return new Promise<BookModel | string>(async (resolve, reject) => {
      try {
        let cover: any = "";
        let key: string,
          name: string,
          author: string,
          publisher: string,
          description: string,
          charset: string,
          page: number;
        [name, author, description, publisher, charset, page] = [
          bookName,
          "Unknown author",
          "",
          "",
          "",
          0,
        ];
        let metadata: any;
        let rendition = BookUtil.getRendtion(
          file_content,
          extension.toUpperCase(),
          "",
          "",
          StorageUtil.getReaderConfig("isSliding") === "yes" ? "sliding" : ""
        );

        switch (extension) {
          case "pdf":
          case "epub":
          case "mobi":
          case "azw":
          case "azw3":
          case "fb2":
            metadata = await rendition.getMetadata();
            [name, author, description, publisher, cover] = [
              metadata.name || bookName,
              metadata.author || "Unknown author",
              metadata.description || "",
              metadata.publisher || "",
              metadata.cover || "",
            ];
            break;
          case "cbr":
          case "cbt":
          case "cbz":
          case "cb7":
            metadata = await rendition.getMetadata();
            cover = metadata.cover;
            break;
          case "txt":
            metadata = await rendition.getMetadata(file_content);
            charset = metadata.charset;
            break;
          default:
            break;
        }
        let format = extension.toUpperCase();
        key = new Date().getTime() + "";
        if (
          StorageUtil.getReaderConfig("isPrecacheBook") === "yes" &&
          extension !== "pdf"
        ) {
          let cache = await rendition.preCache(file_content);
          if (cache !== "err") {
            BookUtil.addBook("cache-" + key, "zip", cache);
          }
        }
        resolve(
          new BookModel(
            key,
            name,
            author,
            description,
            md5,
            cover,
            format,
            publisher,
            size,
            page,
            path,
            charset
          )
        );
      } catch (error) {
        console.log(error);
        resolve("get_metadata_error");
      }
    });
  }
}

export default BookUtil;
