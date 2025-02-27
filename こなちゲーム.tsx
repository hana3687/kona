import React, { useState, useEffect, useRef } from 'react';

const PastaCheeseGame = () => {
  // タッチデバイス向けに preventDefault() を許可する
  useEffect(() => {
    // タッチイベントのパッシブモードを解除するためのスタイルを追加
    const style = document.createElement('style');
    style.innerHTML = `
      .prevent-touch-select {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
    `;
    document.head.appendChild(style);
    
    // クリーンアップ
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  // ゲームの状態管理
  const [gameState, setGameState] = useState('title'); // title, start-animation, playing, game-over
  const [cheeseAmount, setCheeseAmount] = useState(0); // パスタにかかったチーズの量(g)
  const [timeLeft, setTimeLeft] = useState(10); // 残り時間(秒)
  const [isPushing, setIsPushing] = useState(false); // ボタンを押しているか
  const [pushDuration, setPushDuration] = useState(0); // ボタンを押している時間
  const [isThrowingCheese, setIsThrowingCheese] = useState(false); // チーズを投げている最中か
  const [cheeseParticles, setCheeseParticles] = useState([]); // チーズの粒子

  // タイマーと計測用のRef
  const timerRef = useRef(null);
  const pushStartTimeRef = useRef(0);
  const animationFrameRef = useRef(null);

  // ゲーム開始処理
  const startGame = () => {
    setGameState('start-animation');
    setTimeout(() => {
      setGameState('playing');
      setCheeseAmount(0);
      setTimeLeft(10);
      setIsPushing(false);
      setPushDuration(0);
      setIsThrowingCheese(false);
      setCheeseParticles([]);
      
      // 10秒タイマーをスタート
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setGameState('game-over');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, 1000); // 「かけろ！」アニメーションの表示時間
  };

  // ボタンを押し始めた時の処理
  const handlePushStart = () => {
    if (gameState === 'playing' && !isThrowingCheese) {
      setIsPushing(true);
      pushStartTimeRef.current = Date.now();
    }
  };

  // ボタンを離した時の処理
  const handlePushEnd = () => {
    if (gameState === 'playing' && isPushing) {
      setIsPushing(false);
      const endTime = Date.now();
      const duration = (endTime - pushStartTimeRef.current) / 1000; // 秒単位に変換
      setPushDuration(duration);
      throwCheese(duration);
    }
  };

  // チーズ粒子を生成する関数
  const createCheeseParticles = () => {
    const particleCount = 30; // 粒子の数
    const newParticles = [];
    
    for (let i = 0; i < particleCount; i++) {
      // 粒子一つ一つに少しランダム性を持たせる
      const offsetX = Math.random() * 10 - 5;
      const offsetY = Math.random() * 10 - 5;
      const size = Math.random() * 6 + 2; // 2px～8pxのランダムなサイズ
      
      newParticles.push({
        id: i,
        x: 20 + offsetX, // 左側の人の位置から開始（20%位置）
        y: 40 + offsetY, // 人と同じ位置
        size,
        vx: 0, // 初速度X
        vy: 0, // 初速度Y
        landed: false // パスタに着地したかどうか
      });
    }
    
    return newParticles;
  };

  // チーズを投げる処理
  const throwCheese = (duration) => {
    if (isThrowingCheese) return;
    
    setIsThrowingCheese(true);
    
    // 投げる距離は押した時間に比例（最大値あり）
    const maxDuration = 2; // 2秒以上押しても同じ距離
    const normalizedDuration = Math.min(duration, maxDuration) / maxDuration;
    const throwPower = normalizedDuration;
    
    // チーズ粒子を生成
    const particles = createCheeseParticles();
    setCheeseParticles(particles);
    
    // チーズ粒子のアニメーション
    let startTime = null;
    let landedParticles = 0;
    
    const animateCheese = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const animationDuration = 1500; // アニメーション時間（ミリ秒）
      
      if (elapsed < animationDuration && landedParticles < particles.length) {
        // 時間経過に応じてチーズ粒子の位置を更新
        const updatedParticles = particles.map(particle => {
          if (particle.landed) return particle;
          
          // ランダム性を持たせた速度計算
          const randomFactor = 0.8 + Math.random() * 0.4; // 0.8～1.2のランダム係数
          const progress = elapsed / animationDuration;
          
          // 飛ぶ距離は押した時間（throwPower）に依存 - 左から右へ
          const targetX = 20 + (80 - 20) * throwPower * progress * randomFactor;
          // 放物線の高さ（押した時間が長いほど高く）- 上下を反対に
          const heightFactor = throwPower * 40;
          const targetY = 40 - Math.sin(progress * Math.PI) * heightFactor * randomFactor;
          
          // パスタに当たったかの判定（右側80%の位置にパスタがある）
          const hitPasta = targetX >= 80;
          
          if (hitPasta && !particle.landed) {
            // パスタに当たった場合
            landedParticles++;
            // チーズ1粒につき0.1～0.3グラムをランダムに加算
            const cheeseWeight = (0.1 + Math.random() * 0.2);
            setCheeseAmount(prev => +(prev + cheeseWeight).toFixed(2));
            
            return {
              ...particle,
              x: 80 + (Math.random() * 10 - 5), // パスタの位置にランダム性を持たせる
              y: 40 + (Math.random() * 20 - 10), // パスタの高さにランダム性を持たせる
              landed: true
            };
          }
          
          return {
            ...particle,
            x: targetX,
            y: targetY,
            // アニメーション終了時にパスタに当たらなかった粒子は画面外へ
            landed: progress >= 0.95 ? true : false
          };
        });
        
        setCheeseParticles(updatedParticles);
        animationFrameRef.current = requestAnimationFrame(animateCheese);
      } else {
        // アニメーション終了
        setIsThrowingCheese(false);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animateCheese);
  };

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <div className="w-full h-screen bg-blue-50 flex flex-col items-center justify-center relative overflow-hidden prevent-touch-select">
      {/* 中央配置のもの */}
      <div className="flex flex-col items-center justify-center w-full h-full">
        {/* タイトル画面 */}
        {gameState === 'title' && (
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-4xl font-bold mb-16 text-yellow-600">遠距離からパスタにチーズをかける人</h1>
            <button 
              className="bg-yellow-500 text-white font-bold py-4 px-10 rounded-full text-2xl shadow-lg hover:bg-yellow-600 transition"
              onClick={startGame}
            >
              START
            </button>
          </div>
        )}

        {/* 「かけろ！」アニメーション */}
        {gameState === 'start-animation' && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <p className="text-black text-8xl font-bold animate-pulse">かけろ！</p>
          </div>
        )}

        {/* ゲームプレイ中とゲームオーバー時の中央配置コンテンツ */}
        {(gameState === 'playing' || gameState === 'game-over') && (
          <>
            {/* スコア表示 */}
            <div className="absolute top-4 left-0 right-0 flex justify-center">
              <div className="bg-white px-4 py-2 rounded-md shadow-md">
                <p className="text-xl font-bold">
                  チーズ: {cheeseAmount.toFixed(2)}g
                </p>
              </div>
            </div>

            {/* タイマー表示 */}
            <div className="absolute top-16 left-0 right-0 flex justify-center">
              <div className={`px-4 py-2 rounded-md shadow-md ${timeLeft <= 3 ? 'bg-red-100' : 'bg-white'}`}>
                <p className={`text-xl font-bold ${timeLeft <= 3 ? 'text-red-600' : 'text-gray-800'}`}>
                  残り時間: {timeLeft}秒
                </p>
              </div>
            </div>

            {/* 中央のPUSHボタン */}
            <div className="absolute left-1/2 bottom-20 transform -translate-x-1/2 select-none touch-none">
              <button
                className={`w-24 h-24 rounded-full text-lg font-bold shadow-md ${
                  isPushing 
                    ? 'bg-red-500 text-white transform scale-95' 
                    : 'bg-red-400 text-white hover:bg-red-500'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handlePushStart();
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  handlePushEnd();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handlePushStart();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handlePushEnd();
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  return false;
                }}
                onDragStart={(e) => {
                  e.preventDefault();
                  return false;
                }}
                disabled={gameState === 'game-over' || isThrowingCheese}
              >
                PUSH
              </button>
            </div>

            {/* ゲームオーバー表示 */}
            {gameState === 'game-over' && (
              <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-30">
                <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                  <h2 className="text-3xl font-bold mb-4">ゲーム終了！</h2>
                  <p className="text-2xl mb-6">チーズ: {cheeseAmount.toFixed(2)}g</p>
                  <button 
                    className="bg-yellow-500 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg hover:bg-yellow-600 transition"
                    onClick={() => setGameState('title')}
                  >
                    タイトルに戻る
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 左側配置の「人」 */}
      {(gameState === 'playing' || gameState === 'game-over') && (
        <div className="absolute left-10 top-1/3 w-16 h-32 bg-blue-400 rounded-md flex items-center justify-center">
          人
        </div>
      )}

      {/* 右側配置の「パスタ」 */}
      {(gameState === 'playing' || gameState === 'game-over') && (
        <div className="absolute right-10 top-1/3 w-1/4 h-64 flex items-center justify-center">
          <div className="w-full h-full relative">
            {/* パスタのイラスト（プレースホルダー） */}
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="w-32 h-32 bg-yellow-100 rounded-full border-4 border-yellow-300 flex items-center justify-center">
                <div className="w-24 h-24 bg-yellow-200 rounded-full flex items-center justify-center text-lg font-bold text-yellow-800">
                  パスタ
                </div>
              </div>
              <div className="w-40 h-4 bg-gray-300 mt-2 rounded-lg"></div>
            </div>
            
            {/* チーズの視覚効果 - パスタの上に黄色い層 */}
            {cheeseAmount > 0 && (
              <div 
                className="absolute top-1/3 left-1/4 right-1/4 bottom-1/3 bg-yellow-400 rounded-full"
                style={{ opacity: Math.min(0.8, cheeseAmount / 50) }}
              ></div>
            )}
          </div>
        </div>
      )}

      {/* チーズ粒子 */}
      {cheeseParticles.map(particle => (
        <div 
          key={particle.id}
          className="absolute bg-yellow-300 rounded-full z-20"
          style={{ 
            left: `${particle.x}%`, 
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            transform: 'translate(-50%, -50%)'
          }}
        ></div>
      ))}
    </div>
  );
};

export default PastaCheeseGame;