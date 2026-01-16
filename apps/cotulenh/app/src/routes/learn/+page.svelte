<script lang="ts">
  import { LearnController, type Level } from '@cotulenh/learn'
  import { onMount } from 'svelte'
  import BoardContainer from '$lib/components/BoardContainer.svelte'
  import type { BoardApi } from '@cotulenh/board'
  import { toast } from 'svelte-sonner'
  
  import '$lib/styles/board.css'

  let learn = $state<LearnController>()
  let selectedStageId = $state<string>()
  let currentLevel = $state<Level>()
  let levelController = $state<any>()
  let boardApi = $state<BoardApi>()
  let moveCount = $state(0)
  let message = $state('')
  let isCompleted = $state(false)

  onMount(() => {
    learn = new LearnController()
  })

  function selectStage(stageId: string) {
    try {
      learn?.selectStage(stageId)
      selectedStageId = stageId
      
      const stageCtrl = learn?.getCurrentStageController()
      levelController = stageCtrl?.getLevelController()
      currentLevel = stageCtrl?.getCurrentLevel()
      
      resetLevel()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load stage')
    }
  }

  function resetLevel() {
    levelController?.reset()
    isCompleted = false
    message = ''
    moveCount = 0
    
    if (currentLevel && boardApi) {
      const game = levelController?.getGame()
      
      boardApi.set({
        fen: game?.fen() ?? currentLevel.fen,
        turnColor: game?.turn() ?? 'r',
        movable: {
          free: false,
          color: 'both',
          dests: getBoardDests(),
          events: {
            after: handleMove,
          },
        },
      })
    }
  }

  function getBoardDests() {
    const legalMoves = levelController?.getLegalMoves() ?? []
    const dests = new Map()
    
    for (const move of legalMoves) {
      if (!dests.has(move.from)) {
        dests.set(move.from, [])
      }
      dests.get(move.from).push(move.to)
    }
    
    return dests
  }

  function handleMove(orig: string, dest: string) {
    if (!levelController) return
    
    const result = levelController.validateMove({ from: orig, to: dest })
    
    if (!result.valid) {
      toast.error(result.message)
      resetLevel()
      return
    }
    
    const progress = levelController.getProgress()
    moveCount = progress.moves
    message = result.message ?? ''
    
    if (result.success) {
      isCompleted = true
      toast.success('Level completed! ⭐')
    }
    
    // Update board
    const game = levelController.getGame()
    boardApi?.set({
      fen: game.fen(),
      turnColor: game.turn(),
      movable: {
        free: false,
        color: 'both',
        dests: getBoardDests(),
        events: {
          after: handleMove,
        },
      },
    })
  }

  function nextLevel() {
    const stageCtrl = learn?.getCurrentStageController()
    const hasNext = stageCtrl?.nextLevel()
    
    if (hasNext) {
      levelController = stageCtrl?.getLevelController()
      currentLevel = stageCtrl?.getCurrentLevel()
      resetLevel()
    } else {
      toast.success('Stage completed! 🎉')
      selectedStageId = undefined
      currentLevel = undefined
    }
  }

  function goBack() {
    selectedStageId = undefined
    currentLevel = undefined
    levelController = undefined
  }

  function handleBoardReady(api: BoardApi) {
    boardApi = api
    resetLevel()
  }
</script>

<div class="container mx-auto p-8">
  <h1 class="text-4xl font-bold mb-8">Learn Cotulenh</h1>

  {#if !selectedStageId}
    <!-- Stage Selection -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each learn?.getAllStages() ?? [] as stage}
        <button
          onclick={() => selectStage(stage.id)}
          class="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
        >
          <h2 class="text-2xl font-semibold mb-2">{stage.title}</h2>
          <p class="text-gray-600">{stage.description}</p>
          <p class="text-sm text-gray-500 mt-2">{stage.levels.length} levels</p>
        </button>
      {/each}
    </div>
  {:else if currentLevel}
    <!-- Level View -->
    <div class="max-w-6xl mx-auto">
      <button
        onclick={goBack}
        class="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
      >
        ← Back to Stages
      </button>

      <div class="grid md:grid-cols-2 gap-8">
        <!-- Board -->
        <div>
          <BoardContainer
            config={{
              fen: currentLevel.fen,
              orientation: 'red',
              movable: { color: 'both', free: false },
            }}
            onApiReady={handleBoardReady}
          />
        </div>

        <!-- Instructions -->
        <div class="space-y-6">
          <div class="bg-white border-2 border-gray-300 rounded-lg p-6">
            <h2 class="text-2xl font-bold mb-4">{currentLevel.goal}</h2>
            
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <span class="text-gray-600">Moves:</span>
                <span class="font-semibold">{moveCount} / {currentLevel.nbMoves}</span>
              </div>

              {#if currentLevel.allowedMoveTypes}
                <div>
                  <span class="text-gray-600">Allowed:</span>
                  <div class="flex flex-wrap gap-2 mt-2">
                    {#each currentLevel.allowedMoveTypes as moveType}
                      <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {moveType}
                      </span>
                    {/each}
                  </div>
                </div>
              {/if}

              {#if message}
                <div class="p-4 bg-blue-50 border border-blue-200 rounded">
                  <p class="text-blue-800 font-medium">{message}</p>
                </div>
              {/if}
            </div>

            <div class="flex gap-4 mt-6">
              {#if isCompleted}
                <button
                  onclick={nextLevel}
                  class="px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600 font-semibold"
                >
                  Next Level →
                </button>
              {/if}
              
              <button
                onclick={resetLevel}
                class="px-6 py-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Reset
              </button>
            </div>
          </div>

          <!-- Level Info -->
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
            <p class="font-mono text-xs text-gray-600 mb-2">FEN:</p>
            <p class="font-mono text-xs break-all">{currentLevel.fen}</p>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .container {
    min-height: 100vh;
  }
</style>
