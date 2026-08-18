import FeuilletonModal from '../FeuilletonModal'
import VideoPackageModal from '../VideoPackageModal'
import NewsScriptModal from '../NewsScriptModal'
import NewsAudioModal from '../NewsAudioModal'
import NewsPhotosModal from '../NewsPhotosModal'

export default function NewsModalsContainer({
  currentFeuilleton,
  setCurrentFeuilleton,
  activeSavedPackage,
  handleCloseSavedPackage,
  scriptTextPackage,
  setScriptTextPackage,
  audioPackage,
  setAudioPackage,
  setVideoPackage,
  photoTopic,
  setPhotoTopic,
  newsPhotos,
  loadingPhotos,
  handleFetchNewsPhotos,
  fetchSavedPackages,
}) {
  return (
    <>
      <FeuilletonModal
        feuilleton={currentFeuilleton}
        onOpenPhotos={handleFetchNewsPhotos}
        onRefreshPackages={fetchSavedPackages}
        onClose={() => {
          setCurrentFeuilleton(null)
          fetchSavedPackages()
        }}
      />

      <VideoPackageModal
        pkg={activeSavedPackage}
        onOpenPhotos={handleFetchNewsPhotos}
        onOpenScriptText={pkg => setScriptTextPackage(pkg)}
        onOpenAudio={pkg => setAudioPackage(pkg)}
        onOpenVideo={pkg => setVideoPackage(pkg)}
        onClose={handleCloseSavedPackage}
        onRefresh={fetchSavedPackages}
      />

      <NewsScriptModal
        pkg={scriptTextPackage}
        onClose={() => setScriptTextPackage(null)}
        onSaved={fetchSavedPackages}
      />

      <NewsAudioModal
        pkg={audioPackage}
        onClose={() => setAudioPackage(null)}
        onRefresh={fetchSavedPackages}
      />

      <NewsPhotosModal
        newsTopic={photoTopic}
        photos={newsPhotos}
        loading={loadingPhotos}
        onClose={() => setPhotoTopic(null)}
        onSaved={fetchSavedPackages}
        onReload={() => handleFetchNewsPhotos(photoTopic, true)}
      />
    </>
  )
}
