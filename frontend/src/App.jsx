import { useState, useEffect } from 'react'
import './App.css'

const API_BASE = 'http://localhost:3001'

function App() {
  const [activeView, setActiveView] = useState('popular')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')


  useEffect(() => {
    fetchData(activeView)
  }, [activeView])

  const fetchData = async (view, param = '') => {
    setLoading(true)
    try {
      let url = ''
      switch(view) {
        case 'popular':
          url = `${API_BASE}/movies/popular/high-rated`
          break
        case 'genres':
          url = `${API_BASE}/genres/stats/ratings`
          break
        case 'directors':
          url = `${API_BASE}/directors/above-average`
          break
        case 'actors':
          url = `${API_BASE}/actors/prolific`
          break
        case 'pairs':
          url = `${API_BASE}/actors/frequent-pairs`
          break
        case 'decades':
          url = `${API_BASE}/movies/best-per-decade`
          break
        case 'drama-romance':
          url = `${API_BASE}/movies/genre/drama-romance`
          break
        case 'high-rated-people':
          url = `${API_BASE}/people/high-rated-knownfor`
          break
        case 'high-budget-low-rating':
          url = `${API_BASE}/analytics/high-budget-low-rating`
          break
        case 'high-roi':
          url = `${API_BASE}/analytics/high-roi-movies`
          break
        case 'movie-genres':
          url = `${API_BASE}/movies/${encodeURIComponent(param)}/genres`
          break
        case 'person-known-for':
          url = `${API_BASE}/people/${encodeURIComponent(param)}/known-for`
          break
        default:
          url = `${API_BASE}/movies/popular/high-rated`
      }
      
      const response = await fetch(url)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (view) => {
    if (searchInput.trim()) {
      setActiveView(view)
      fetchData(view, searchInput)
    }
  }

  const openMovieDetails = async (movieId) => {
  setDetailsLoading(true)
  setDetailsError('')
  try {
    const response = await fetch(`${API_BASE}/movies/${encodeURIComponent(movieId)}/details`)
    if (!response.ok) {
      throw new Error('Failed to fetch movie details')
    }
    const result = await response.json()
    setSelectedMovie(result)
  } catch (err) {
    console.error('Error fetching movie details:', err)
    setDetailsError('Could not load movie details')
  } finally {
    setDetailsLoading(false)
  }
}

const closeMovieDetails = () => {
  setSelectedMovie(null)
  setDetailsError('')
}

  const renderContent = () => {
    if (loading) {
      return <div className="loader">Loading...</div>
    }

    if (!data || data.length === 0) {
      return <div className="empty-state">No data found</div>
    }

    switch(activeView) {
      case 'popular':
      return (
        <div className="movie-grid">
          {data.map((movie, idx) => (
            <div
              key={movie.movie_id}
              className="movie-card"
              style={{ animationDelay: `${idx * 0.05}s`, cursor: 'pointer' }}
              onClick={() => openMovieDetails(movie.movie_id)}
            >
              <div className="movie-rank">#{idx + 1}</div>
              <h3 className="movie-title">{movie.title}</h3>
              <div className="movie-meta">
                <span className="year">{movie.release_year}</span>
                <span className="rating">★ {movie.rating}</span>
              </div>
              <div className="votes">{movie.num_votes.toLocaleString()} votes</div>
            </div>
          ))}
        </div>
      )


      case 'genres':
        return (
          <div className="stats-grid">
            {data.map((genre, idx) => (
              <div key={genre.genre_name} className="stat-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                <h3 className="stat-title">{genre.genre_name}</h3>
                <div className="stat-value">★ {parseFloat(genre.avg_rating).toFixed(2)}</div>
                <div className="stat-meta">{genre.num_movies} movies</div>
              </div>
            ))}
          </div>
        )

      case 'directors':
        return (
          <div className="person-list">
            {data.map((director, idx) => (
              <div key={director.person_id} className="person-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="person-rank">{idx + 1}</div>
                <div className="person-info">
                  <h3 className="person-name">{director.name}</h3>
                  <div className="person-stats">
                    <span>{director.num_directed_popular_movies} films</span>
                    <span>★ {parseFloat(director.director_avg_rating).toFixed(2)} avg</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'actors':
        return (
          <div className="person-list">
            {data.map((actor, idx) => (
              <div key={actor.person_id} className="person-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="person-rank">{idx + 1}</div>
                <div className="person-info">
                  <h3 className="person-name">{actor.name}</h3>
                  <div className="person-stats">
                    <span>{actor.num_acting_roles} roles</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'pairs':
        return (
          <div className="pairs-grid">
            {data.map((pair, idx) => (
              <div key={`${pair.actor1_id}-${pair.actor2_id}`} className="pair-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="pair-names">
                  <div className="actor-name">{pair.actor1_name}</div>
                  <div className="pair-connector">×</div>
                  <div className="actor-name">{pair.actor2_name}</div>
                </div>
                <div className="pair-count">{pair.num_movies_together} films together</div>
              </div>
            ))}
          </div>
        )

      case 'decades':
        return (
          <div className="decade-timeline">
            {data.map((movie, idx) => (
              <div key={movie.movie_id} className="decade-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="decade-year">{movie.decade_start_year}s</div>
                <div className="decade-content">
                  <h3 className="movie-title">{movie.title}</h3>
                  <div className="movie-meta">
                    <span className="rating">★ {movie.rating}</span>
                    <span className="votes">{movie.num_votes.toLocaleString()} votes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'drama-romance':
        return (
          <div className="movie-grid">
            {data.map((movie, idx) => (
              <div key={movie.movie_id} className="movie-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                <h3 className="movie-title">{movie.title}</h3>
                <div className="movie-meta">
                  <span className="year">{movie.release_year}</span>
                  <span className="rating">★ {movie.rating}</span>
                </div>
                <div className="votes">{movie.num_votes.toLocaleString()} votes</div>
              </div>
            ))}
          </div>
        )

      case 'high-rated-people':
        return (
          <div className="person-list">
            {data.map((person, idx) => (
              <div key={person.person_id} className="person-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="person-rank">{idx + 1}</div>
                <div className="person-info">
                  <h3 className="person-name">{person.name}</h3>
                  <div className="person-stats">
                    <span>All known-for movies rated 8.0+</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'high-budget-low-rating':
        return (
          <div className="analytics-grid">
            {data.map((movie, idx) => (
              <div key={movie.movie_id} className="analytics-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                <h3 className="movie-title">{movie.title}</h3>
                <div className="analytics-details">
                  <div className="detail-row">
                    <span>Year:</span>
                    <span>{movie.release_year}</span>
                  </div>
                  <div className="detail-row">
                    <span>Rating:</span>
                    <span className="rating-low">★ {movie.imdb_rating}</span>
                  </div>
                  <div className="detail-row">
                    <span>Budget:</span>
                    <span>${(movie.budget / 1000000).toFixed(0)}M</span>
                  </div>
                  <div className="detail-row">
                    <span>Revenue:</span>
                    <span>${(movie.revenue / 1000000).toFixed(0)}M</span>
                  </div>
                  <div className="detail-row profit-row">
                    <span>Profit:</span>
                    <span className={movie.profit >= 0 ? 'profit-positive' : 'profit-negative'}>
                      ${(movie.profit / 1000000).toFixed(0)}M
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'high-roi':
        return (
          <div className="analytics-grid">
            {data.map((movie, idx) => (
              <div key={movie.movie_id} className="analytics-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                <h3 className="movie-title">{movie.title}</h3>
                <div className="analytics-details">
                  <div className="detail-row">
                    <span>Year:</span>
                    <span>{movie.release_year}</span>
                  </div>
                  <div className="detail-row">
                    <span>Rating:</span>
                    <span className="rating">★ {movie.imdb_rating}</span>
                  </div>
                  <div className="detail-row">
                    <span>Budget:</span>
                    <span>${(movie.budget / 1000000).toFixed(0)}M</span>
                  </div>
                  <div className="detail-row">
                    <span>Revenue:</span>
                    <span>${(movie.revenue / 1000000).toFixed(0)}M</span>
                  </div>
                  <div className="detail-row roi-row">
                    <span>ROI:</span>
                    <span className="roi-value">{(movie.roi * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'movie-genres':
      case 'person-known-for':
        return (
          <div className="search-results">
            {data.map((item, idx) => (
              <div key={idx} className="result-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                {item.genre_name && <div className="genre-badge">{item.genre_name}</div>}
                {item.title && (
                  <>
                    <h3 className="movie-title">{item.title}</h3>
                    <div className="movie-meta">
                      {item.rating && <span className="rating">★ {item.rating}</span>}
                      {item.num_votes && <span>{item.num_votes.toLocaleString()} votes</span>}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">CINEPHILE</h1>
          <p className="tagline">Explore the World of Cinema</p>
        </div>
      </header>

      <nav className="nav">
        <div className="nav-section">
          <div className="nav-label">Discover</div>
          <button 
            className={activeView === 'popular' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('popular')}
          >
            Top Rated
          </button>
          <button 
            className={activeView === 'decades' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('decades')}
          >
            Best by Decade
          </button>
          <button 
            className={activeView === 'drama-romance' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('drama-romance')}
          >
            Drama × Romance
          </button>
        </div>

        <div className="nav-section">
          <div className="nav-label">People</div>
          <button 
            className={activeView === 'directors' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('directors')}
          >
            Elite Directors
          </button>
          <button 
            className={activeView === 'actors' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('actors')}
          >
            Prolific Actors
          </button>
          <button 
            className={activeView === 'pairs' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('pairs')}
          >
            Dynamic Duos
          </button>
          <button 
            className={activeView === 'high-rated-people' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('high-rated-people')}
          >
            Perfect Records
          </button>
        </div>

        <div className="nav-section">
          <div className="nav-label">Analytics</div>
          <button 
            className={activeView === 'genres' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('genres')}
          >
            Genre Stats
          </button>
          <button 
            className={activeView === 'high-budget-low-rating' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('high-budget-low-rating')}
          >
            Big Budget Flops
          </button>
          <button 
            className={activeView === 'high-roi' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('high-roi')}
          >
            Highest ROI
          </button>
        </div>

        <div className="nav-section">
          <div className="nav-label">Search</div>
          <div className="search-group">
            <input 
              type="text" 
              className="search-input"
              placeholder="Movie title..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch('movie-genres')}
            />
            <button 
              className="search-btn"
              onClick={() => handleSearch('movie-genres')}
            >
              Genres
            </button>
          </div>
          <div className="search-group">
            <input 
              type="text" 
              className="search-input"
              placeholder="Person name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch('person-known-for')}
            />
            <button 
              className="search-btn"
              onClick={() => handleSearch('person-known-for')}
            >
              Known For
            </button>
          </div>
        </div>
      </nav>

      <main className="main">
        {renderContent()}
      </main>

      {(selectedMovie || detailsLoading || detailsError) && (
        <div className="movie-modal-backdrop" onClick={closeMovieDetails}>
          <div
            className="movie-modal"
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
          >
            <button className="movie-modal-close" onClick={closeMovieDetails}>
              ✕
            </button>

            {detailsLoading && !selectedMovie && (
              <div className="movie-modal-loading">Loading movie details...</div>
            )}

            {detailsError && !detailsLoading && !selectedMovie && (
              <div className="movie-modal-error">{detailsError}</div>
            )}

            {selectedMovie && (
              <div className="movie-modal-content">
                <div className="movie-modal-header">
                  <h2>{selectedMovie.title}</h2>
                  <div className="movie-modal-meta">
                    {selectedMovie.release_year && <span>{selectedMovie.release_year}</span>}
                    {selectedMovie.runtime_minutes && (
                      <span>{selectedMovie.runtime_minutes} min</span>
                    )}
                    {selectedMovie.rating && (
                      <span>★ {selectedMovie.rating} ({selectedMovie.num_votes.toLocaleString()} votes)</span>
                    )}
                  </div>
                </div>

                <div className="movie-modal-body">
                  {selectedMovie.poster_path && (
                    <div className="movie-modal-poster">
                      {/* simple TMDb image test – if you want to try it */}
                      <img
                        src={`https://image.tmdb.org/t/p/w300${selectedMovie.poster_path}`}
                        alt={selectedMovie.title}
                      />
                    </div>
                  )}

                  <div className="movie-modal-info">
                    {selectedMovie.genres && selectedMovie.genres.length > 0 && (
                      <div className="movie-modal-section">
                        <h4>Genres</h4>
                        <div className="movie-modal-tags">
                          {selectedMovie.genres.map((g) => (
                            <span key={g} className="movie-tag">{g}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedMovie.directors && selectedMovie.directors.length > 0 && (
                      <div className="movie-modal-section">
                        <h4>Director{selectedMovie.directors.length > 1 ? 's' : ''}</h4>
                        <p>{selectedMovie.directors.join(', ')}</p>
                      </div>
                    )}

                    {selectedMovie.cast && selectedMovie.cast.length > 0 && (
                      <div className="movie-modal-section">
                        <h4>Top Cast</h4>
                        <p>{selectedMovie.cast.join(', ')}</p>
                      </div>
                    )}

                    {selectedMovie.overview && (
                      <div className="movie-modal-section">
                        <h4>Overview</h4>
                        <p>{selectedMovie.overview}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default App