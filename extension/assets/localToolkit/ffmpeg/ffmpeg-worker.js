const FFMessageType = {
  LOAD: "LOAD",
  EXEC: "EXEC",
  FFPROBE: "FFPROBE",
  WRITE_FILE: "WRITE_FILE",
  READ_FILE: "READ_FILE",
  DELETE_FILE: "DELETE_FILE",
  RENAME: "RENAME",
  CREATE_DIR: "CREATE_DIR",
  LIST_DIR: "LIST_DIR",
  DELETE_DIR: "DELETE_DIR",
  ERROR: "ERROR",
  LOG: "LOG",
  PROGRESS: "PROGRESS",
  MOUNT: "MOUNT",
  UNMOUNT: "UNMOUNT"
}

let ffmpeg = null

const ensureCoreLoaded = async ({ coreURL, wasmURL, workerURL }) => {
  const module = await import(/* @vite-ignore */ coreURL)
  self.createFFmpegCore = module?.default
  if (!self.createFFmpegCore) {
    throw new Error("failed to import ffmpeg-core.js")
  }

  ffmpeg = await self.createFFmpegCore({
    mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL, workerURL }))}`
  })

  ffmpeg.setLogger((data) => {
    self.postMessage({ type: FFMessageType.LOG, data })
  })

  ffmpeg.setProgress((data) => {
    self.postMessage({ type: FFMessageType.PROGRESS, data })
  })
}

const exec = ({ args, timeout = -1 }) => {
  ffmpeg.setTimeout(timeout)
  ffmpeg.exec(...args)
  const ret = ffmpeg.ret
  ffmpeg.reset()
  return ret
}

const ffprobe = ({ args, timeout = -1 }) => {
  ffmpeg.setTimeout(timeout)
  ffmpeg.ffprobe(...args)
  const ret = ffmpeg.ret
  ffmpeg.reset()
  return ret
}

self.onmessage = async ({ data: { id, type, data } }) => {
  const trans = []

  try {
    if (type !== FFMessageType.LOAD && !ffmpeg) {
      throw new Error("ffmpeg is not loaded, call `await ffmpeg.load()` first")
    }

    let result
    switch (type) {
      case FFMessageType.LOAD:
        if (!ffmpeg) {
          await ensureCoreLoaded(data)
          result = true
        } else {
          result = false
        }
        break
      case FFMessageType.EXEC:
        result = exec(data)
        break
      case FFMessageType.FFPROBE:
        result = ffprobe(data)
        break
      case FFMessageType.WRITE_FILE:
        ffmpeg.FS.writeFile(data.path, data.data)
        result = true
        break
      case FFMessageType.READ_FILE:
        result = ffmpeg.FS.readFile(data.path, { encoding: data.encoding })
        break
      case FFMessageType.DELETE_FILE:
        ffmpeg.FS.unlink(data.path)
        result = true
        break
      case FFMessageType.RENAME:
        ffmpeg.FS.rename(data.oldPath, data.newPath)
        result = true
        break
      case FFMessageType.CREATE_DIR:
        ffmpeg.FS.mkdir(data.path)
        result = true
        break
      case FFMessageType.LIST_DIR: {
        const names = ffmpeg.FS.readdir(data.path)
        result = names.map((name) => {
          const stat = ffmpeg.FS.stat(`${data.path}/${name}`)
          return { name, isDir: ffmpeg.FS.isDir(stat.mode) }
        })
        break
      }
      case FFMessageType.DELETE_DIR:
        ffmpeg.FS.rmdir(data.path)
        result = true
        break
      case FFMessageType.MOUNT: {
        const fs = ffmpeg.FS.filesystems[data.fsType]
        if (!fs) {
          result = false
          break
        }
        ffmpeg.FS.mount(fs, data.options, data.mountPoint)
        result = true
        break
      }
      case FFMessageType.UNMOUNT:
        ffmpeg.FS.unmount(data.mountPoint)
        result = true
        break
      default:
        throw new Error(`unknown message type: ${type}`)
    }

    if (result instanceof Uint8Array) {
      trans.push(result.buffer)
    }

    self.postMessage({ id, type, data: result }, trans)
  } catch (error) {
    self.postMessage({
      id,
      type: FFMessageType.ERROR,
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
