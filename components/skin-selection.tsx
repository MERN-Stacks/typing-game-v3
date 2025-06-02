"use client"

interface SkinSelectionProps {
  skins: string[]
  selectedSkin: string
  onSkinSelect: (skin: string) => void
  onBack: () => void
}

export default function SkinSelection({ skins, selectedSkin, onSkinSelect, onBack }: SkinSelectionProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white/90 p-10 rounded-3xl shadow-2xl text-center">
        <h2 className="text-3xl font-bold text-purple-600 mb-8">스킨 선택</h2>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {skins.map((skin) => (
            <button
              key={skin}
              onClick={() => onSkinSelect(skin)}
              className={`w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 flex items-center justify-center text-3xl transition-all duration-300 hover:scale-110 border-4 ${
                selectedSkin === skin ? "border-purple-600 shadow-lg shadow-purple-400/50" : "border-transparent"
              }`}
            >
              {skin}
            </button>
          ))}
        </div>

        <button
          onClick={onBack}
          className="px-8 py-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-all duration-300"
        >
          돌아가기
        </button>
      </div>
    </div>
  )
}
