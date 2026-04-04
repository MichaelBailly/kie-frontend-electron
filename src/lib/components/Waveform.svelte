<script lang="ts">
	import type * as D3 from 'd3';
	import { toPlayableAudioUrl } from '$lib/utils/audio';

	// d3 is loaded dynamically so it never appears in the SSR server bundle.
	// (A top-level static import would cause ERR_MODULE_NOT_FOUND in the packaged
	// Electron AppImage, where node_modules are not present at runtime.)
	let d3: typeof D3 | undefined;

	let {
		audioUrl,
		height = 140,
		currentTime = 0,
		duration = 0,
		markerTime,
		markerColor = '#ef4444',
		onSeek
	}: {
		audioUrl: string;
		height?: number;
		currentTime?: number;
		duration?: number;
		markerTime?: number;
		markerColor?: string;
		onSeek?: (time: number) => void;
	} = $props();

	let container: HTMLDivElement | undefined = $state();
	let overlay: HTMLDivElement | undefined = $state();
	let waveformData: number[] = $state([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let resolvedAudioUrl = $derived(toPlayableAudioUrl(audioUrl) || '');

	// Hover state for scrub tooltip
	let hoverX = $state<number | null>(null);
	let hoverTime = $state<number>(0);

	async function loadWaveform(sourceUrl: string = resolvedAudioUrl) {
		try {
			isLoading = true;
			error = null;

			const audioContext = new AudioContext();
			const response = await fetch(sourceUrl);
			const arrayBuffer = await response.arrayBuffer();
			const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

			// Get the audio data from both channels and merge them
			const channelData = audioBuffer.getChannelData(0);
			const samples = 300; // More samples for smoother visualization
			const blockSize = Math.floor(channelData.length / samples);

			const peaks: number[] = [];
			for (let i = 0; i < samples; i++) {
				let max = 0;
				for (let j = 0; j < blockSize; j++) {
					const val = Math.abs(channelData[i * blockSize + j]);
					if (val > max) max = val;
				}
				peaks.push(max);
			}

			// Normalize peaks
			const maxPeak = Math.max(...peaks);
			waveformData = peaks.map((p) => (maxPeak > 0 ? p / maxPeak : 0));
			isLoading = false;

			// Draw the waveform
			drawWaveform();
		} catch (err) {
			console.error('Error loading waveform:', err);
			error = 'Failed to load waveform';
			isLoading = false;
		}
	}

	function drawWaveform() {
		if (!container || waveformData.length === 0 || !d3) return;
		// Local alias so TypeScript can narrow the type in nested closures below.
		const lib = d3;

		// Clear previous SVG
		lib.select(container).selectAll('svg').remove();

		const containerWidth = container.clientWidth;
		const paddingH = 8;
		const paddingTop = 8;
		const paddingBottom = 22; // extra space for time labels
		const innerWidth = containerWidth - paddingH * 2;
		const innerHeight = height - paddingTop - paddingBottom;
		const midY = innerHeight / 2;

		const svg = lib
			.select(container)
			.append('svg')
			.attr('width', containerWidth)
			.attr('height', height)
			.attr('class', 'rounded-lg overflow-hidden');

		const defs = svg.append('defs');

		// --- Circuit-board background pattern ---
		const patternSize = 30;
		const pattern = defs
			.append('pattern')
			.attr('id', 'circuit-bg')
			.attr('width', patternSize)
			.attr('height', patternSize)
			.attr('patternUnits', 'userSpaceOnUse');

		pattern
			.append('rect')
			.attr('width', patternSize)
			.attr('height', patternSize)
			.attr('fill', '#080818');

		pattern
			.append('line')
			.attr('x1', 0)
			.attr('y1', patternSize / 2)
			.attr('x2', patternSize)
			.attr('y2', patternSize / 2)
			.attr('stroke', '#141430')
			.attr('stroke-width', 0.8);

		pattern
			.append('line')
			.attr('x1', patternSize / 2)
			.attr('y1', 0)
			.attr('x2', patternSize / 2)
			.attr('y2', patternSize)
			.attr('stroke', '#141430')
			.attr('stroke-width', 0.8);

		pattern
			.append('circle')
			.attr('cx', patternSize / 2)
			.attr('cy', patternSize / 2)
			.attr('r', 1.5)
			.attr('fill', '#1e1e44');

		pattern.append('circle').attr('cx', 0).attr('cy', 0).attr('r', 1).attr('fill', '#1e1e44');

		// --- Glow filter for playhead ---
		const glowFilter = defs
			.append('filter')
			.attr('id', 'playhead-glow')
			.attr('x', '-200%')
			.attr('y', '-50%')
			.attr('width', '500%')
			.attr('height', '200%');

		glowFilter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');

		const feMerge = glowFilter.append('feMerge');
		feMerge.append('feMergeNode').attr('in', 'coloredBlur');
		feMerge.append('feMergeNode').attr('in', 'coloredBlur');
		feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

		// --- Soft glow filter for played region overlay ---
		const playedGlow = defs
			.append('filter')
			.attr('id', 'played-glow')
			.attr('x', '-5%')
			.attr('y', '-50%')
			.attr('width', '110%')
			.attr('height', '200%');
		playedGlow.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'blur');
		const playedMerge = playedGlow.append('feMerge');
		playedMerge.append('feMergeNode').attr('in', 'blur');
		playedMerge.append('feMergeNode').attr('in', 'SourceGraphic');

		// --- Fill gradient: blue → magenta → purple (horizontal, full width) ---
		const fillGradientUnplayed = defs
			.append('linearGradient')
			.attr('id', 'wf-fill-unplayed')
			.attr('gradientUnits', 'userSpaceOnUse')
			.attr('x1', paddingH)
			.attr('y1', 0)
			.attr('x2', paddingH + innerWidth)
			.attr('y2', 0);

		fillGradientUnplayed
			.append('stop')
			.attr('offset', '0%')
			.attr('stop-color', '#0369a1')
			.attr('stop-opacity', '0.55');
		fillGradientUnplayed
			.append('stop')
			.attr('offset', '55%')
			.attr('stop-color', '#a21caf')
			.attr('stop-opacity', '0.55');
		fillGradientUnplayed
			.append('stop')
			.attr('offset', '100%')
			.attr('stop-color', '#6b21a8')
			.attr('stop-opacity', '0.55');

		// --- Fill gradient: played region — brighter, more saturated ---
		const fillGradientPlayed = defs
			.append('linearGradient')
			.attr('id', 'wf-fill-played')
			.attr('gradientUnits', 'userSpaceOnUse')
			.attr('x1', paddingH)
			.attr('y1', 0)
			.attr('x2', paddingH + innerWidth)
			.attr('y2', 0);

		fillGradientPlayed.append('stop').attr('offset', '0%').attr('stop-color', '#38bdf8');
		fillGradientPlayed.append('stop').attr('offset', '55%').attr('stop-color', '#e879f9');
		fillGradientPlayed.append('stop').attr('offset', '100%').attr('stop-color', '#a855f7');

		const progress = duration > 0 ? currentTime / duration : 0;
		const progressX = progress * innerWidth;

		// --- Clip path: played region (left of playhead) ---
		defs
			.append('clipPath')
			.attr('id', 'clip-played')
			.append('rect')
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', progressX)
			.attr('height', innerHeight + paddingTop + paddingBottom);

		// --- Clip path: unplayed region (right of playhead) ---
		defs
			.append('clipPath')
			.attr('id', 'clip-unplayed')
			.append('rect')
			.attr('x', progressX)
			.attr('y', 0)
			.attr('width', innerWidth - progressX + paddingH * 2)
			.attr('height', innerHeight + paddingTop + paddingBottom);

		// Background
		svg
			.append('rect')
			.attr('width', containerWidth)
			.attr('height', height)
			.attr('fill', 'url(#circuit-bg)');

		// Subtle played-region background tint
		if (progressX > 0) {
			svg
				.append('rect')
				.attr('x', paddingH)
				.attr('y', 0)
				.attr('width', progressX)
				.attr('height', height - paddingBottom)
				.attr('fill', 'rgba(56,189,248,0.04)');
		}

		const g = svg.append('g').attr('transform', `translate(${paddingH},${paddingTop})`);

		// Scales
		const xScale = lib
			.scaleLinear()
			.domain([0, waveformData.length - 1])
			.range([0, innerWidth]);

		const yScale = lib.scaleLinear().domain([0, 1]).range([midY, 0]);

		// Piecewise contrast function
		const displayData = waveformData.map((d) => {
			if (d <= 0.6) return d;
			const t = (d - 0.6) / 0.4;
			return 0.6 + Math.pow(t, 2) * 0.4;
		});

		// Area generators
		const upperArea = lib
			.area<number>()
			.x((_: number, i: number) => xScale(i))
			.y0(midY)
			.y1((d: number) => yScale(d))
			.curve(lib.curveBasis);

		const lowerArea = lib
			.area<number>()
			.x((_: number, i: number) => xScale(i))
			.y0(midY)
			.y1((d: number) => midY + (midY - yScale(d)))
			.curve(lib.curveBasis);

		// Outline line generators
		const upperLine = lib
			.line<number>()
			.x((_: number, i: number) => xScale(i))
			.y((d: number) => yScale(d))
			.curve(lib.curveBasis);

		const lowerLine = lib
			.line<number>()
			.x((_: number, i: number) => xScale(i))
			.y((d: number) => midY + (midY - yScale(d)))
			.curve(lib.curveBasis);

		// Inner outline lines (slightly reduced amplitude)
		const upperLineInner = lib
			.line<number>()
			.x((_: number, i: number) => xScale(i))
			.y((d: number) => yScale(d * 0.86))
			.curve(lib.curveBasis);

		const lowerLineInner = lib
			.line<number>()
			.x((_: number, i: number) => xScale(i))
			.y((d: number) => midY + (midY - yScale(d * 0.86)))
			.curve(lib.curveBasis);

		// ── UNPLAYED region (dim) ──────────────────────────────────────────
		const gUnplayed = g.append('g').attr('clip-path', 'url(#clip-unplayed)');

		gUnplayed
			.append('path')
			.datum(displayData)
			.attr('d', upperArea)
			.attr('fill', 'url(#wf-fill-unplayed)')
			.attr('opacity', 0.9);

		gUnplayed
			.append('path')
			.datum(displayData)
			.attr('d', lowerArea)
			.attr('fill', 'url(#wf-fill-unplayed)')
			.attr('opacity', 0.35);

		gUnplayed
			.append('path')
			.datum(displayData)
			.attr('d', upperLine)
			.attr('fill', 'none')
			.attr('stroke', '#22d3ee')
			.attr('stroke-width', 1.5)
			.attr('opacity', 0.5);

		gUnplayed
			.append('path')
			.datum(displayData)
			.attr('d', lowerLine)
			.attr('fill', 'none')
			.attr('stroke', '#22d3ee')
			.attr('stroke-width', 1.5)
			.attr('opacity', 0.25);

		gUnplayed
			.append('path')
			.datum(displayData)
			.attr('d', upperLineInner)
			.attr('fill', 'none')
			.attr('stroke', '#c026d3')
			.attr('stroke-width', 1)
			.attr('opacity', 0.4);

		gUnplayed
			.append('path')
			.datum(displayData)
			.attr('d', lowerLineInner)
			.attr('fill', 'none')
			.attr('stroke', '#c026d3')
			.attr('stroke-width', 1)
			.attr('opacity', 0.25);

		// ── PLAYED region (bright, fully saturated) ───────────────────────
		const gPlayed = g.append('g').attr('clip-path', 'url(#clip-played)');

		gPlayed
			.append('path')
			.datum(displayData)
			.attr('d', upperArea)
			.attr('fill', 'url(#wf-fill-played)')
			.attr('opacity', 0.92);

		gPlayed
			.append('path')
			.datum(displayData)
			.attr('d', lowerArea)
			.attr('fill', 'url(#wf-fill-played)')
			.attr('opacity', 0.4);

		gPlayed
			.append('path')
			.datum(displayData)
			.attr('d', upperLine)
			.attr('fill', 'none')
			.attr('stroke', '#00e5ff')
			.attr('stroke-width', 1.5);

		gPlayed
			.append('path')
			.datum(displayData)
			.attr('d', lowerLine)
			.attr('fill', 'none')
			.attr('stroke', '#00e5ff')
			.attr('stroke-width', 1.5)
			.attr('opacity', 0.6);

		gPlayed
			.append('path')
			.datum(displayData)
			.attr('d', upperLineInner)
			.attr('fill', 'none')
			.attr('stroke', '#e040fb')
			.attr('stroke-width', 1);

		gPlayed
			.append('path')
			.datum(displayData)
			.attr('d', lowerLineInner)
			.attr('fill', 'none')
			.attr('stroke', '#e040fb')
			.attr('stroke-width', 1)
			.attr('opacity', 0.6);

		// ── PLAYHEAD ──────────────────────────────────────────────────────
		if (duration > 0) {
			// Playhead glow halo
			g.append('line')
				.attr('x1', progressX)
				.attr('x2', progressX)
				.attr('y1', 0)
				.attr('y2', innerHeight)
				.attr('stroke', '#00e5ff')
				.attr('stroke-width', 6)
				.attr('opacity', 0.18)
				.attr('filter', 'url(#playhead-glow)');

			// Playhead main line
			g.append('line')
				.attr('x1', progressX)
				.attr('x2', progressX)
				.attr('y1', 0)
				.attr('y2', innerHeight)
				.attr('stroke', '#ffffff')
				.attr('stroke-width', 1.5)
				.attr('filter', 'url(#playhead-glow)');

			// Playhead diamond handle at midpoint
			const handleSize = 5;
			g.append('polygon')
				.attr(
					'points',
					[
						[progressX, midY - handleSize],
						[progressX + handleSize, midY],
						[progressX, midY + handleSize],
						[progressX - handleSize, midY]
					]
						.map((p) => p.join(','))
						.join(' ')
				)
				.attr('fill', '#00e5ff')
				.attr('stroke', '#ffffff')
				.attr('stroke-width', 1)
				.attr('filter', 'url(#playhead-glow)');
		}

		// Marker line
		if (markerTime !== undefined && duration > 0) {
			const markerX = (markerTime / duration) * innerWidth;
			g.append('line')
				.attr('x1', markerX)
				.attr('x2', markerX)
				.attr('y1', 0)
				.attr('y2', innerHeight)
				.attr('stroke', markerColor)
				.attr('stroke-width', 2)
				.attr('opacity', 0.9);
		}

		// ── TIME LABELS ───────────────────────────────────────────────────
		const formatTime = (secs: number) => {
			const m = Math.floor(secs / 60);
			const s = Math.floor(secs % 60);
			return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
		};

		// Current time — floated near playhead, clamped to not overflow edges
		if (duration > 0) {
			const labelX = Math.max(
				paddingH + 2,
				Math.min(containerWidth - paddingH - 36, paddingH + progressX - 14)
			);
			svg
				.append('text')
				.attr('x', labelX)
				.attr('y', height - 6)
				.attr('fill', '#00e5ff')
				.attr('font-family', 'monospace')
				.attr('font-size', '11')
				.attr('font-weight', 'bold')
				.text(formatTime(currentTime));
		} else {
			svg
				.append('text')
				.attr('x', paddingH + 2)
				.attr('y', height - 6)
				.attr('fill', '#00e5ff')
				.attr('font-family', 'monospace')
				.attr('font-size', '11')
				.text(formatTime(currentTime));
		}

		// Total duration — fixed to right
		svg
			.append('text')
			.attr('x', containerWidth - paddingH - 2)
			.attr('y', height - 6)
			.attr('fill', '#64748b')
			.attr('font-family', 'monospace')
			.attr('font-size', '11')
			.attr('text-anchor', 'end')
			.text(formatTime(duration));
	}

	// ── Event helpers (stable, not recreated on redraw) ───────────────────────
	function getSeekTime(clientX: number): number {
		if (!container || duration === 0) return 0;
		const svgEl = container.querySelector('svg');
		if (!svgEl) return 0;
		const rect = svgEl.getBoundingClientRect();
		const paddingH = 8;
		const innerWidth = rect.width - paddingH * 2;
		const x = clientX - rect.left - paddingH;
		const ratio = Math.max(0, Math.min(1, x / innerWidth));
		return ratio * duration;
	}

	function handleOverlayClick(event: MouseEvent) {
		if (duration === 0) return;
		onSeek?.(getSeekTime(event.clientX));
	}

	function handleOverlayMouseMove(event: MouseEvent) {
		if (!container) return;
		const svgEl = container.querySelector('svg');
		if (!svgEl) return;
		const rect = svgEl.getBoundingClientRect();
		const paddingH = 8;
		const innerWidth = rect.width - paddingH * 2;
		const x = event.clientX - rect.left - paddingH;
		hoverX = Math.max(0, Math.min(innerWidth, x)) + paddingH;
		hoverTime = getSeekTime(event.clientX);
	}

	function handleOverlayMouseLeave() {
		hoverX = null;
	}

	const formatHoverTime = (secs: number) => {
		const m = Math.floor(secs / 60);
		const s = Math.floor(secs % 60);
		return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
	};

	$effect(() => {
		let cancelled = false;

		if (!d3) {
			void import('d3').then((d3module) => {
				if (cancelled) return;
				d3 = d3module;
				void loadWaveform();
			});
		}

		const handleResize = () => {
			if (!isLoading && waveformData.length > 0) {
				drawWaveform();
			}
		};
		window.addEventListener('resize', handleResize);

		return () => {
			cancelled = true;
			window.removeEventListener('resize', handleResize);
		};
	});

	$effect(() => {
		const sourceUrl = resolvedAudioUrl;
		if (d3) {
			void loadWaveform(sourceUrl);
		}
	});

	// Redraw when currentTime or markerTime changes
	$effect(() => {
		if ((currentTime !== undefined || markerTime !== undefined) && !isLoading) {
			drawWaveform();
		}
	});
</script>

{#if isLoading}
	<div class="flex items-center justify-center" style="height: {height}px;">
		<div class="flex items-center gap-2">
			<svg class="h-5 w-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			<span class="text-sm text-gray-500 dark:text-gray-400">Loading waveform...</span>
		</div>
	</div>
{:else if error}
	<div class="flex items-center justify-center" style="height: {height}px;">
		<div class="flex items-center gap-2 text-red-500">
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span class="text-sm">{error}</span>
		</div>
	</div>
{:else}
	<div class="relative w-full" style="height: {height}px;">
		<!-- SVG is rendered here by D3 -->
		<div bind:this={container} class="w-full" style="height: {height}px;"></div>

		<!-- Stable transparent overlay for reliable pointer events (fixes seek-on-click bug) -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			bind:this={overlay}
			class="absolute inset-0 cursor-pointer"
			onclick={handleOverlayClick}
			onmousemove={handleOverlayMouseMove}
			onmouseleave={handleOverlayMouseLeave}
		></div>

		<!-- Hover scrub tooltip -->
		{#if hoverX !== null}
			<div
				class="pointer-events-none absolute top-0 flex flex-col items-center"
				style="left: {hoverX}px; transform: translateX(-50%);"
			>
				<!-- Vertical hairline -->
				<div
					class="w-px opacity-60"
					style="height: {height - 22}px; background: rgba(255,255,255,0.35);"
				></div>
				<!-- Time badge -->
				<div
					class="mt-0.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white"
					style="background: rgba(10,10,30,0.82); border: 1px solid rgba(0,229,255,0.35); backdrop-filter: blur(4px);"
				>
					{formatHoverTime(hoverTime)}
				</div>
			</div>
		{/if}
	</div>
{/if}
