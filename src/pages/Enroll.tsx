import { Link, useNavigate } from 'react-router-dom'
import FaceScanner from '../components/FaceScanner'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../auth/AuthContext'
import { faceEnroll } from '../lib/face'

export default function Enroll() {
  const nav = useNavigate()
  const { profile, refreshProfile } = useAuth()
  return (
    <div className="max-w-md space-y-6">
      <PageHeader tag="Biometrics" title="Add your" accent="face ID" />
      {profile?.has_face ? (
        <div className="card space-y-3"><p className="text-white">Your face is enrolled.</p><Link to="/home" className="btn">Back</Link></div>
      ) : (
        <div className="card space-y-4">
          <p className="text-sm text-mist">Face ID unlocks hiring hitmen, accepting contracts and buying in Sosumi.</p>
          <FaceScanner label="Scan and enroll" onEmbedding={async (e) => { await faceEnroll(e); await refreshProfile(); nav('/home') }} />
        </div>
      )}
    </div>
  )
}
