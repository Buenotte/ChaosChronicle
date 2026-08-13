import { useState } from 'react'
import { toast } from 'sonner'

export default function FeuilletonModal({ feuilleton, onOpenPhotos, onClose }) {
  if (!feuilleton) return null

  const [saving, setSaving] = useState(false)
  const [savedInfo, setSavedInfo] = useState(null)
  const [generatingAudio, setGeneratingAudio] = useState(false)
  const [audioInfo, setAudioInfo] = useState(null)

  const handleSavePackage = async () => {
    setSaving(true)
    const toastId = toast.loading('Сохранение видео-пакета в news/...', {
      description: 'Скачивание 20 фото, файла script.txt и project.json...',
    })

    try {
      const res = await fetch('/api/save-news-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: feuilleton.title,
          text: feuilleton.text,
          model: feuilleton.modelName,
          source: feuilleton.source,
          imageUrl: feuilleton.imageUrl,
          images: feuilleton.images || [],
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка сохранения')

      setSavedInfo(data)
      toast.success('📦 Видео-пакет сохранен!', {
        id: toastId,
        description: `📜 Текст: ✅ Готов | 📸 Фото: ✅ (${data.savedPhotosCount} шт. в news/) | 🎙️ Аудио: ⚠️ Отсутствует (нажмите «Создать audio.mp3»)`,
        duration: 12000,
      })
    } catch (err) {
      toast.error('Ошибка сохранения пакета', {
        id: toastId,
        description: err.message,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateAudio = async () => {
    if (!savedInfo || !savedInfo.bundleDir) return
    setGeneratingAudio(true)

    let seconds = 0
    const toastId = toast.loading('🎙️ Генерация аудио-файла через edge-tts... [0 сек.]', {
      description: 'Голос: Nikolay (ru-RU-DmitryNeural) | Скорость: 0% | Голос: -10%',
    })

    const timer = setInterval(() => {
      seconds++
      toast.loading(`🎙️ Генерация аудио-файла через edge-tts... [${seconds} сек.]`, {
        id: toastId,
        description: 'Идет обработка текста и синтез речи (Nikolay, 0%, -10%)...',
      })
    }, 1000)

    try {
      const startTime = Date.now()
      const res = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleDir: savedInfo.bundleDir,
          text: feuilleton.text,
        }),
      })

      const data = await res.json()
      clearInterval(timer)

      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка озвучки')

      const totalTimeSec = Math.round((Date.now() - startTime) / 1000)
      setAudioInfo(data)

      toast.success('🎉 Все компоненты видео-пакета полностью готовы!', {
        id: toastId,
        description: `📜 Текст: ✅ | 📸 Фото: ✅ (${savedInfo.savedPhotosCount || 0} шт.) | 🎙️ Аудио: ✅ audio.mp3 (${totalTimeSec} сек., Nikolay)`,
        duration: 14000,
      })
    } catch (err) {
      clearInterval(timer)
      toast.error('Ошибка создания аудио', {
        id: toastId,
        description: err.message,
      })
    } finally {
      setGeneratingAudio(false)
    }
  }

  const articleImages = feuilleton.images && feuilleton.images.length > 0
    ? feuilleton.images
    : (feuilleton.imageUrl ? [feuilleton.imageUrl] : [])

  let brollImageCounter = 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-badge">🎭 3-Минутный Сатирический Фельетон</span>
            <h2 className="modal-title">{feuilleton.title}</h2>
            <div className="modal-stats">
              <span>⏱️ Хронометраж: ~{feuilleton.minutes} мин.</span>
              <span>📝 Слов: {feuilleton.words}</span>
              <span>🤖 Модель: {feuilleton.modelName}</span>
            </div>
            {savedInfo && (
              <div className="saved-file-notice">
                📦 Видео-пакет сохранен в: <code>news/{savedInfo.folderName}</code> ({savedInfo.savedPhotosCount} фото скачано)
                {audioInfo && <span> · 🎙️ <code>audio.mp3</code> (Nikolay) создан</span>}
              </div>
            )}
          </div>
          <div className="modal-header-actions">
            <button
              className="photos-header-btn"
              onClick={() => onOpenPhotos({ title: feuilleton.title, images: feuilleton.images, id: feuilleton.id, url: feuilleton.url })}
            >
              🖼️ Фото к новости
            </button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Audio Player im Haupt-Feuilleton-Dialog */}
        {savedInfo && (audioInfo || savedInfo.hasAudio) && (
          <div style={{ padding: '0 1.5rem', marginTop: '1rem' }}>
            <div className="audio-player-box" style={{ marginBottom: 0 }}>
              <div className="audio-player-title">🎙️ Прослушать озвучку Nikolay (audio.mp3, 0%, -10%):</div>
              <audio controls src={`/news-static/${savedInfo.folderName}/audio.mp3`} className="audio-element" autoPlay>
                Ваш браузер не поддерживает элемент audio.
              </audio>
            </div>
          </div>
        )}

        <div className="modal-body">
          {feuilleton.text.split('\n\n').map((paragraph, idx) => {
            const isBRoll = paragraph.startsWith('[B-Roll:')
            if (isBRoll) {
              const currentPhoto = articleImages[brollImageCounter % (articleImages.length || 1)]
              brollImageCounter++

              return (
                <div key={idx} className="broll-inline-card">
                  {currentPhoto && (
                    <div className="broll-photo-wrap">
                      <img
                        src={currentPhoto}
                        alt={`Кадр к новости - ${feuilleton.title}`}
                        className="broll-inline-photo"
                        onError={e => e.target.parentNode.style.display = 'none'}
                      />
                      <div className="broll-photo-badge">
                        📸 Оригинальное фото к этой новости #{((brollImageCounter - 1) % (articleImages.length || 1)) + 1}
                      </div>
                    </div>
                  )}
                  <div className="broll-tag">
                    <span className="broll-icon">🖼️ Visual B-Roll / Кадр:</span> {paragraph.replace('[B-Roll:', '').replace(']', '').trim()}
                  </div>
                </div>
              )
            }

            return (
              <p key={idx} className="feuilleton-p">
                {paragraph}
              </p>
            )
          })}
        </div>

        <div className="modal-footer">
          <button
            className="save-bundle-btn"
            onClick={handleSavePackage}
            disabled={saving || !!savedInfo}
          >
            {saving ? '⏳ Сохранение...' : (savedInfo ? '✅ Пакет сохранен в news/' : '📦 Сохранить видео-пакет в news/')}
          </button>
          
          {savedInfo && (
            <button
              className="audio-gen-btn"
              onClick={handleGenerateAudio}
              disabled={generatingAudio || !!audioInfo}
            >
              {generatingAudio ? '⏳ Озвучка Nikolay...' : (audioInfo ? '🎙️ audio.mp3 создан' : '🎙️ Создать audio.mp3 (Nikolay)')}
            </button>
          )}

          <button className="close-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}
